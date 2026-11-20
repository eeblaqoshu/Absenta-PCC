// lib/actions/sesi.ts
// Server actions untuk sesi presensi: buat, ubah, tutup lebih awal, hapus.
// Aturan:
// - titik lokasi & jam mulai agenda berasal dari AGENDA (sesi tidak menyimpan titik/radius);
// - satu agenda boleh punya banyak sesi, tiap sesi menentukan tanggal, jam mulai, dan
//   jam maksimum kedatangan (`tutup_at`);
// - semua mutasi ditolak bila periode kepengurusan sudah `selesai`.
"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  agendaTelahBerlalu,
  gabungTanggalDenganJamWib,
  hitungStatusAgenda,
  tanggalWib,
} from "@/lib/waktu";
import { z } from "zod";

const RX_JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
function tanggalValid(nilai: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;
  const date = new Date(`${nilai}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === nilai;
}

const SesiInputSchema = z.object({
  agendaId: z.coerce.number().int().positive(),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal sesi tidak valid")
    .refine(tanggalValid, "Tanggal sesi tidak valid"),
  jamMulai: z.string().regex(RX_JAM, "Jam mulai tidak valid (format HH:mm)"),
  jamMaksDatang: z
    .string()
    .regex(RX_JAM, "Jam maksimum kedatangan tidak valid (format HH:mm)"),
});

function bacaForm(formData: FormData) {
  return {
    agendaId: formData.get("agendaId"),
    tanggal: formData.get("tanggal"),
    jamMulai: formData.get("jamMulai"),
    jamMaksDatang: formData.get("jamMaksDatang"),
  };
}

/** Tanggal (YYYY-MM-DD) dari kolom DATE (disimpan sebagai UTC tengah malam). */
function tanggalDariDate(date: Date): string {
  return new Date(date).toISOString().split("T")[0];
}

function dalamRentangAgenda(
  agenda: { tglPelaksanaan: Date; tglSelesai: Date | null },
  tanggal: string
): boolean {
  const mulai = tanggalDariDate(agenda.tglPelaksanaan);
  const akhir = tanggalDariDate(agenda.tglSelesai ?? agenda.tglPelaksanaan);
  return tanggal >= mulai && tanggal <= akhir;
}

export async function buatSesiAction(prevState: unknown, formData: FormData) {
  try {
    const adsek = await requireAdsek();

    const parsed = SesiInputSchema.safeParse(bacaForm(formData));
    if (!parsed.success) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message } };
    }
    const { agendaId, tanggal, jamMulai, jamMaksDatang } = parsed.data;

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        proker: {
          select: { id: true, periodeId: true, periode: { select: { status: true } } },
        },
      },
    });
    if (!agenda) {
      return { error: { kode: "AGENDA_TIDAK_DITEMUKAN", pesan: "Agenda tidak ditemukan" } };
    }
    if (agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat membuat sesi pada periode kepengurusan yang sudah selesai",
        },
      };
    }
    if (agendaTelahBerlalu(agenda.tglPelaksanaan, agenda.tglSelesai)) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan:
            "Agenda ini sudah selesai, sesi presensi tidak bisa dibuat lagi. Anda masih bisa melihat daftar hadirnya.",
        },
      };
    }
    if (
      hitungStatusAgenda(
        agenda.tglPelaksanaan,
        agenda.waktuPelaksanaan,
        agenda.tglSelesai,
        new Date(),
      ) !== "sedang_berlangsung"
    ) {
      return {
        error: {
          kode: "AGENDA_BELUM_BERLANGSUNG",
          pesan: "Sesi baru hanya bisa dibuat saat agenda sedang berlangsung",
        },
      };
    }
    if (!dalamRentangAgenda(agenda, tanggal)) {
      return {
        error: {
          kode: "TANGGAL_DI_LUAR_RENTANG",
          pesan: "Tanggal sesi harus di dalam rentang tanggal pelaksanaan agenda",
        },
      };
    }
    if (agenda.lat === null || agenda.lng === null) {
      return {
        error: {
          kode: "LOKASI_AGENDA_BELUM_DIATUR",
          pesan:
            "Titik lokasi presensi agenda belum diatur. Atur dulu titik lokasi di kartu agenda sebelum membuat sesi.",
        },
      };
    }

    const bukaAt = gabungTanggalDenganJamWib(new Date(tanggal), jamMulai);
    const tutupAt = gabungTanggalDenganJamWib(new Date(tanggal), jamMaksDatang);
    if (Number.isNaN(bukaAt.getTime()) || Number.isNaN(tutupAt.getTime())) {
      return { error: { kode: "WAKTU_TIDAK_VALID", pesan: "Tanggal/jam sesi tidak valid" } };
    }
    if (tutupAt <= bukaAt) {
      return {
        error: {
          kode: "WAKTU_TIDAK_VALID",
          pesan: "Jam maksimum kedatangan harus setelah jam mulai sesi",
        },
      };
    }

    const sesiTumpangTindih = await prisma.sesiPresensi.findFirst({
      where: { agendaId, bukaAt: { lt: tutupAt }, tutupAt: { gt: bukaAt } },
      select: { id: true },
    });
    if (sesiTumpangTindih) {
      return {
        error: {
          kode: "SESI_BERTUMPANG_TINDIH",
          pesan: "Waktu sesi bertumpang tindih dengan sesi lain pada agenda ini",
        },
      };
    }

    const sesiKembar = await prisma.sesiPresensi.findFirst({
      where: { agendaId, bukaAt },
      select: { id: true },
    });
    if (sesiKembar) {
      return {
        error: {
          kode: "SESI_DUPLIKAT",
          pesan: "Sudah ada sesi dengan tanggal dan jam mulai yang sama pada agenda ini",
        },
      };
    }

    const sesi = await prisma.sesiPresensi.create({
      data: {
        agendaId,
        dibuatOleh: adsek.id,
        bukaAt,
        tutupAt,
        qrSecret: crypto.randomBytes(32).toString("hex"),
      },
    });

    revalidatePath(`/dashboard/proker/${agenda.proker.id}`);
    revalidatePath(`/dashboard/presensi/${sesi.id}`);

    return {
      sukses: true,
      pesan: "Sesi presensi berhasil dibuat",
      sesiId: sesi.id,
      agendaId,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal membuat sesi" } };
  }
}

export async function ubahSesiAction(sesiId: number, formData: FormData) {
  try {
    await requireAdsek();

    const parsed = SesiInputSchema.safeParse(bacaForm(formData));
    if (!parsed.success) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message } };
    }
    const { agendaId, tanggal, jamMulai, jamMaksDatang } = parsed.data;

    const sesi = await prisma.sesiPresensi.findUnique({
      where: { id: sesiId },
      include: {
        agenda: {
          select: {
            id: true,
            tglPelaksanaan: true,
            tglSelesai: true,
            waktuPelaksanaan: true,
            proker: { select: { id: true, periode: { select: { status: true } } } },
          },
        },
        _count: { select: { presensi: true } },
      },
    });
    if (!sesi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi tidak ditemukan" } };
    }
    if (sesi.agenda.id !== agendaId) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Agenda sesi tidak cocok" } };
    }
    if (sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah sesi pada periode kepengurusan yang sudah selesai",
        },
      };
    }
    if (!dalamRentangAgenda(sesi.agenda, tanggal)) {
      return {
        error: {
          kode: "TANGGAL_DI_LUAR_RENTANG",
          pesan: "Tanggal sesi harus di dalam rentang tanggal pelaksanaan agenda",
        },
      };
    }

    const bukaAt = gabungTanggalDenganJamWib(new Date(tanggal), jamMulai);
    const tutupAt = gabungTanggalDenganJamWib(new Date(tanggal), jamMaksDatang);
    if (Number.isNaN(bukaAt.getTime()) || Number.isNaN(tutupAt.getTime())) {
      return { error: { kode: "WAKTU_TIDAK_VALID", pesan: "Tanggal/jam sesi tidak valid" } };
    }
    if (tutupAt <= bukaAt) {
      return {
        error: {
          kode: "WAKTU_TIDAK_VALID",
          pesan: "Jam maksimum kedatangan harus setelah jam mulai sesi",
        },
      };
    }

    if (
      hitungStatusAgenda(
        sesi.agenda.tglPelaksanaan,
        sesi.agenda.waktuPelaksanaan,
        sesi.agenda.tglSelesai,
        new Date(),
      ) === "selesai"
    ) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan: "Agenda selesai dan sesi hanya dapat dilihat bersama daftar hadirnya",
        },
      };
    }

    const sesiTumpangTindih = await prisma.sesiPresensi.findFirst({
      where: {
        agendaId,
        id: { not: sesiId },
        bukaAt: { lt: tutupAt },
        tutupAt: { gt: bukaAt },
      },
      select: { id: true },
    });
    if (sesiTumpangTindih) {
      return {
        error: {
          kode: "SESI_BERTUMPANG_TINDIH",
          pesan: "Waktu sesi bertumpang tindih dengan sesi lain pada agenda ini",
        },
      };
    }

    // Kalau sudah ada presensi masuk, jam mulai dikunci supaya status kehadiran
    // (hadir/terlambat) yang sudah tercatat tidak berubah.
    if (sesi._count.presensi > 0 && bukaAt.getTime() !== sesi.bukaAt.getTime()) {
      return {
        error: {
          kode: "SESI_SUDAH_ADA_PRESENSI",
          pesan:
            "Sesi sudah punya presensi. Jam mulai tidak boleh diubah; hanya jam maksimum kedatangan yang bisa diubah.",
        },
      };
    }
    const presensiTerakhir = await prisma.presensi.aggregate({
      where: { sesiId },
      _max: { waktuScan: true },
    });
    if (presensiTerakhir._max.waktuScan && tutupAt <= presensiTerakhir._max.waktuScan) {
      return {
        error: {
          kode: "JAM_TUTUP_SEBELUM_PRESENSI",
          pesan: "Jam maksimum kedatangan harus setelah waktu presensi yang sudah tercatat",
        },
      };
    }

    await prisma.sesiPresensi.update({
      where: { id: sesiId },
      data: { bukaAt, tutupAt },
    });

    revalidatePath(`/dashboard/proker/${sesi.agenda.proker.id}`);
    revalidatePath(`/dashboard/presensi/${sesiId}`);

    return { sukses: true, pesan: "Sesi presensi berhasil diperbarui" };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal mengubah sesi" } };
  }
}

/** Ubah jam maksimum kedatangan sesi (tutup_at); tanggal mengikuti buka_at. */
export async function ubahTutupSesiAction(sesiId: number, jamMaksDatang: string) {
  try {
    await requireAdsek();

    const parsed = z
      .string()
      .regex(RX_JAM, "Jam maksimum kedatangan tidak valid (format HH:mm)")
      .safeParse(jamMaksDatang);
    if (!parsed.success) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message } };
    }

    const sesi = await prisma.sesiPresensi.findUnique({
      where: { id: sesiId },
      include: {
        agenda: {
          select: {
            tglPelaksanaan: true,
            tglSelesai: true,
            waktuPelaksanaan: true,
            proker: { select: { id: true, periode: { select: { status: true } } } },
          },
        },
      },
    });
    if (!sesi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi tidak ditemukan" } };
    }
    if (sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah sesi pada periode kepengurusan yang sudah selesai",
        },
      };
    }
    if (
      hitungStatusAgenda(
        sesi.agenda.tglPelaksanaan,
        sesi.agenda.waktuPelaksanaan,
        sesi.agenda.tglSelesai,
        new Date(),
      ) === "selesai"
    ) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan: "Agenda selesai dan sesi tidak dapat diubah lagi",
        },
      };
    }
    const tutupBaru = gabungTanggalDenganJamWib(new Date(tanggalWib(sesi.bukaAt)), parsed.data);
    if (tutupBaru <= sesi.bukaAt) {
      return {
        error: {
          kode: "WAKTU_TIDAK_VALID",
          pesan: "Jam maksimum kedatangan harus setelah jam mulai sesi",
        },
      };
    }

    const sesiTumpangTindih = await prisma.sesiPresensi.findFirst({
      where: {
        agendaId: sesi.agendaId,
        id: { not: sesiId },
        bukaAt: { lt: tutupBaru },
        tutupAt: { gt: sesi.bukaAt },
      },
      select: { id: true },
    });
    if (sesiTumpangTindih) {
      return {
        error: {
          kode: "SESI_BERTUMPANG_TINDIH",
          pesan: "Jam maksimum kedatangan bertumpang tindih dengan sesi lain pada agenda ini",
        },
      };
    }
    const presensiTerakhir = await prisma.presensi.aggregate({
      where: { sesiId },
      _max: { waktuScan: true },
    });
    if (presensiTerakhir._max.waktuScan && tutupBaru <= presensiTerakhir._max.waktuScan) {
      return {
        error: {
          kode: "JAM_TUTUP_SEBELUM_PRESENSI",
          pesan: "Jam maksimum kedatangan harus setelah waktu presensi yang sudah tercatat",
        },
      };
    }

    await prisma.sesiPresensi.update({
      where: { id: sesiId },
      data: { tutupAt: tutupBaru },
    });

    revalidatePath(`/dashboard/proker/${sesi.agenda.proker.id}`);
    revalidatePath(`/dashboard/presensi/${sesiId}`);

    return { sukses: true, pesan: "Jam maksimum kedatangan diperbarui" };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal mengubah sesi" } };
  }
}

export async function tutupSesiSekarangAction(sesiId: number) {
  try {
    await requireAdsek();

    const sesi = await prisma.sesiPresensi.findUnique({
      where: { id: sesiId },
      include: {
        agenda: {
          select: {
            tglPelaksanaan: true,
            tglSelesai: true,
            waktuPelaksanaan: true,
            proker: { select: { id: true, periode: { select: { status: true } } } },
          },
        },
      },
    });

    if (!sesi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi tidak ditemukan" } };
    }
    if (sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah sesi pada periode kepengurusan yang sudah selesai",
        },
      };
    }
    if (
      hitungStatusAgenda(
        sesi.agenda.tglPelaksanaan,
        sesi.agenda.waktuPelaksanaan,
        sesi.agenda.tglSelesai,
        new Date(),
      ) === "selesai"
    ) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan: "Agenda selesai dan sesi tidak dapat diubah lagi",
        },
      };
    }

    const sekarang = new Date();
    if (sekarang >= sesi.tutupAt) {
      return { error: { kode: "SESI_SUDAH_DITUTUP", pesan: "Sesi sudah ditutup" } };
    }

    await prisma.sesiPresensi.update({
      where: { id: sesiId },
      data: { tutupAt: sekarang },
    });

    revalidatePath(`/dashboard/proker/${sesi.agenda.proker.id}`);
    revalidatePath(`/dashboard/presensi/${sesiId}`);

    return { sukses: true, pesan: "Sesi ditutup lebih awal" };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal menutup sesi" } };
  }
}

export async function hapusSesiAction(sesiId: number) {
  try {
    await requireAdsek();

    const sesi = await prisma.sesiPresensi.findUnique({
      where: { id: sesiId },
      include: {
        agenda: {
          select: {
            tglPelaksanaan: true,
            tglSelesai: true,
            waktuPelaksanaan: true,
            proker: { select: { id: true, periode: { select: { status: true } } } },
          },
        },
      },
    });

    if (!sesi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi tidak ditemukan" } };
    }
    if (sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat menghapus sesi pada periode kepengurusan yang sudah selesai",
        },
      };
    }
    if (
      hitungStatusAgenda(
        sesi.agenda.tglPelaksanaan,
        sesi.agenda.waktuPelaksanaan,
        sesi.agenda.tglSelesai,
        new Date(),
      ) === "selesai"
    ) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan:
            "Agenda ini sudah selesai, sesi presensi tidak bisa dihapus lagi. Anda masih bisa melihat daftar hadirnya.",
        },
      };
    }
    await prisma.$transaction(async (tx) => {
      await tx.presensi.deleteMany({ where: { sesiId } });
      await tx.sesiPresensi.delete({ where: { id: sesiId } });
    });

    revalidatePath(`/dashboard/proker/${sesi.agenda.proker.id}`);
    revalidatePath(`/dashboard/presensi/${sesiId}`);

    return { sukses: true, pesan: "Sesi dan data presensinya berhasil dihapus" };
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2003"
    ) {
      return {
        error: {
          kode: "SESI_MEMILIKI_PRESENSI_BARU",
          pesan: "Ada presensi baru saat sesi dihapus. Muat ulang lalu coba lagi.",
        },
      };
    }
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal menghapus sesi" } };
  }
}
