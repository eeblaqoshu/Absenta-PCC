// lib/actions/agenda.ts
// Server actions agenda: buat, ubah, hapus.
// Agenda menyimpan rentang tanggal (tgl_pelaksanaan..tgl_selesai) dan TITIK presensi
// (lokasi_id + snapshot lat/lng/radius_m). Sesi presensi memakai titik ini.
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StatusPeriode, JenisAgenda, TargetPeserta } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { hitungStatusAgenda, tanggalWib } from "@/lib/waktu";

function tanggalValid(nilai: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;
  const date = new Date(`${nilai}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === nilai;
}

const AgendaInputSchema = z.object({
  prokerId: z.coerce.number(),
  jenis: z.nativeEnum(JenisAgenda),
  judul: z.string().min(3, "Judul agenda minimal 3 karakter"),
  urutan: z.coerce.number().default(1),
  tglPelaksanaan: z.string().refine(tanggalValid, "Tanggal pelaksanaan tidak valid"),
  tglSelesai: z.string().nullable().refine((nilai) => nilai === null || tanggalValid(nilai), "Tanggal selesai tidak valid"),
  waktuPelaksanaan: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam agenda tidak valid (format HH:mm)"),
  lokasiNama: z.string().nullable(),
  lokasiId: z.number().int().positive().nullable(),
  lat: z.number().min(-90, "Latitude minimal -90").max(90, "Latitude maksimal 90").nullable(),
  lng: z.number().min(-180, "Longitude minimal -180").max(180, "Longitude maksimal 180").nullable(),
  radiusM: z.number().int().min(10, "Radius minimal 10 meter").max(5000, "Radius maksimal 5000 meter").nullable(),
  targetPeserta: z.nativeEnum(TargetPeserta),
});

function teksAtauNull(nilai: FormDataEntryValue | null): string | null {
  const teks = nilai === null ? "" : String(nilai).trim();
  return teks === "" ? null : teks;
}

function angkaAtauNull(nilai: FormDataEntryValue | null): number | null {
  const teks = nilai === null ? "" : String(nilai).trim();
  if (teks === "") return null;
  const angka = Number(teks);
  return Number.isFinite(angka) ? angka : null;
}

function bacaForm(formData: FormData, prokerId: number) {
  return {
    prokerId,
    jenis: formData.get("jenis"),
    judul: formData.get("judul"),
    urutan: formData.get("urutan") || 1,
    tglPelaksanaan: formData.get("tglPelaksanaan"),
    tglSelesai: teksAtauNull(formData.get("tglSelesai")),
    waktuPelaksanaan: formData.get("waktuPelaksanaan"),
    lokasiNama: teksAtauNull(formData.get("lokasiNama")),
    lokasiId: angkaAtauNull(formData.get("lokasiId")),
    lat: angkaAtauNull(formData.get("lat")),
    lng: angkaAtauNull(formData.get("lng")),
    radiusM: angkaAtauNull(formData.get("radiusM")),
    targetPeserta: formData.get("targetPeserta"),
  };
}

/**
 * Titik presensi agenda: pakai master `lokasi` (koordinat disalin sebagai snapshot)
 * atau titik manual dari peta. Tanpa input titik, kedua field lama dipertahankan
 * (atau null saat agenda baru).
 */
async function tentukanTitik(
  input: { lokasiId: number | null; lat: number | null; lng: number | null; radiusM: number | null },
  lokasiNama: string | null
): Promise<
  | { error: { kode: string; pesan: string } }
  | { data: Pick<Prisma.AgendaUncheckedCreateInput, "lokasiId" | "lat" | "lng" | "radiusM" | "lokasiNama"> }
> {
  if (input.lokasiId) {
    const lokasi = await prisma.lokasi.findUnique({ where: { id: input.lokasiId } });
    if (!lokasi) {
      return { error: { kode: "LOKASI_TIDAK_DITEMUKAN", pesan: "Lokasi tidak ditemukan" } };
    }
    return {
      data: {
        lokasiId: lokasi.id,
        lat: lokasi.lat,
        lng: lokasi.lng,
        radiusM: lokasi.radiusM,
        lokasiNama: lokasiNama ?? lokasi.nama,
      },
    };
  }

  if (input.lat !== null && input.lng !== null) {
    return {
      data: {
        lokasiId: null,
        lat: input.lat,
        lng: input.lng,
        radiusM: input.radiusM ?? 500,
        lokasiNama,
      },
    };
  }

  return { data: { lokasiNama } };
}

export async function buatAgendaAction(prevState: unknown, formData: FormData) {
  try {
    const adsek = await requireAdsek();

    const prokerIdMentah = Number(formData.get("prokerId"));
    if (!Number.isInteger(prokerIdMentah) || prokerIdMentah <= 0) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Proker tidak valid" } };
    }

    const parsed = AgendaInputSchema.safeParse(bacaForm(formData, prokerIdMentah));
    if (!parsed.success) {
      return {
        error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message },
      };
    }

    const {
      prokerId,
      jenis,
      judul,
      urutan,
      tglPelaksanaan,
      tglSelesai,
      waktuPelaksanaan,
      lokasiNama,
      lokasiId,
      lat,
      lng,
      radiusM,
      targetPeserta,
    } = parsed.data;

    const proker = await prisma.proker.findUnique({
      where: { id: prokerId },
      include: { periode: true },
    });

    if (!proker || proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat menambah agenda pada periode kepengurusan yang sudah selesai",
        },
      };
    }

    const tglDate = new Date(tglPelaksanaan);
    const tglSelesaiDate = tglSelesai ? new Date(tglSelesai) : null;
    if (Number.isNaN(tglDate.getTime())) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Tanggal pelaksanaan tidak valid" } };
    }
    if (tglSelesaiDate && Number.isNaN(tglSelesaiDate.getTime())) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Tanggal selesai tidak valid" } };
    }
    if (tglSelesaiDate && tglSelesaiDate < tglDate) {
      return {
        error: { kode: "VALIDASI_GAGAL", pesan: "Tanggal selesai tidak boleh sebelum tanggal mulai" },
      };
    }

    const [jam, menit] = waktuPelaksanaan.split(":");
    const waktuDate = new Date(
      `1970-01-01T${jam.padStart(2, "0")}:${menit.padStart(2, "0")}:00Z`
    );

    const titik = await tentukanTitik({ lokasiId, lat, lng, radiusM }, lokasiNama);
    if ("error" in titik) return { error: titik.error };

    await prisma.agenda.create({
      data: {
        prokerId,
        jenis,
        judul,
        urutan,
        tglPelaksanaan: tglDate,
        tglSelesai: tglSelesaiDate && tglSelesaiDate > tglDate ? tglSelesaiDate : null,
        waktuPelaksanaan: waktuDate,
        targetPeserta,
        dibuatOleh: adsek.id,
        ...titik.data,
      },
    });

    revalidatePath(`/dashboard/proker/${prokerId}`);
    return { sukses: true, pesan: "Agenda kegiatan berhasil ditambahkan" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal membuat agenda kegiatan",
      },
    };
  }
}

export async function ubahAgendaAction(agendaId: number, formData: FormData) {
  try {
    await requireAdsek();

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        proker: { include: { periode: true } },
        sesi: { select: { bukaAt: true } },
        izin: { select: { id: true } },
      },
    });

    if (!agenda || agenda.proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah agenda pada periode yang sudah selesai",
        },
      };
    }
    if (
      hitungStatusAgenda(
        agenda.tglPelaksanaan,
        agenda.waktuPelaksanaan,
        agenda.tglSelesai,
        new Date(),
      ) === "selesai"
    ) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan: "Agenda selesai dan hanya dapat dilihat bersama daftar hadirnya",
        },
      };
    }

    const parsed = AgendaInputSchema.safeParse(bacaForm(formData, agenda.prokerId));
    if (!parsed.success) {
      return {
        error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message },
      };
    }

    const {
      jenis,
      judul,
      urutan,
      tglPelaksanaan,
      tglSelesai,
      waktuPelaksanaan,
      lokasiNama,
      lokasiId,
      lat,
      lng,
      radiusM,
      targetPeserta,
    } = parsed.data;

    const tglDate = new Date(tglPelaksanaan);
    const tglSelesaiDate = tglSelesai ? new Date(tglSelesai) : null;
    if (Number.isNaN(tglDate.getTime())) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Tanggal pelaksanaan tidak valid" } };
    }
    if (tglSelesaiDate && Number.isNaN(tglSelesaiDate.getTime())) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Tanggal selesai tidak valid" } };
    }
    if (tglSelesaiDate && tglSelesaiDate < tglDate) {
      return {
        error: { kode: "VALIDASI_GAGAL", pesan: "Tanggal selesai tidak boleh sebelum tanggal mulai" },
      };
    }

    const tanggalMulaiBaru = tglDate.toISOString().slice(0, 10);
    const tanggalAkhirBaru = (tglSelesaiDate ?? tglDate).toISOString().slice(0, 10);
    const adaSesiDiLuarRentang = agenda.sesi.some((sesi) => {
      const tanggalSesi = tanggalWib(sesi.bukaAt);
      return tanggalSesi < tanggalMulaiBaru || tanggalSesi > tanggalAkhirBaru;
    });
    if (adaSesiDiLuarRentang) {
      return {
        error: {
          kode: "SESI_DI_LUAR_RENTANG_BARU",
          pesan: "Rentang agenda tidak bisa diubah karena ada sesi presensi di luar tanggal baru",
        },
      };
    }
    if ((agenda.sesi.length > 0 || agenda.izin.length > 0) && targetPeserta !== agenda.targetPeserta) {
      return {
        error: {
          kode: "TARGET_TIDAK_BISA_DIUBAH",
          pesan: "Target peserta tidak bisa diubah setelah izin atau sesi dibuat agar riwayat tetap konsisten",
        },
      };
    }

    const [jam, menit] = waktuPelaksanaan.split(":");
    const waktuDate = new Date(
      `1970-01-01T${jam.padStart(2, "0")}:${menit.padStart(2, "0")}:00Z`
    );

    const titik = await tentukanTitik({ lokasiId, lat, lng, radiusM }, lokasiNama);
    if ("error" in titik) return { error: titik.error };

    await prisma.agenda.update({
      where: { id: agendaId },
      data: {
        jenis,
        judul,
        urutan,
        tglPelaksanaan: tglDate,
        tglSelesai: tglSelesaiDate && tglSelesaiDate > tglDate ? tglSelesaiDate : null,
        waktuPelaksanaan: waktuDate,
        targetPeserta,
        ...titik.data,
      },
    });

    revalidatePath(`/dashboard/proker/${agenda.prokerId}`);
    return { sukses: true, pesan: "Agenda kegiatan berhasil diperbarui" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal mengubah agenda",
      },
    };
  }
}

export async function hapusAgendaAction(agendaId: number) {
  try {
    await requireAdsek();

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        proker: { include: { periode: true } },
        sesi: { include: { _count: { select: { presensi: true } } } },
        izin: { select: { id: true } },
      },
    });

    if (!agenda || agenda.proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat menghapus agenda pada periode selesai",
        },
      };
    }
    if (
      hitungStatusAgenda(
        agenda.tglPelaksanaan,
        agenda.waktuPelaksanaan,
        agenda.tglSelesai,
        new Date(),
      ) === "selesai"
    ) {
      return {
        error: {
          kode: "AGENDA_SELESAI",
          pesan: "Agenda selesai dan tidak dapat dihapus lagi",
        },
      };
    }

    // Periksa apakah sesi presensi sudah punya riwayat scan
    const hasPresensi = agenda.sesi.some((s) => s._count.presensi > 0);
    if (hasPresensi) {
      return {
        error: {
          kode: "MEMILIKI_RIWAYAT_PRESENSI",
          pesan: "Agenda tidak dapat dihapus karena sudah memiliki rekaman presensi peserta",
        },
      };
    }
    if (agenda.izin.length > 0) {
      return {
        error: {
          kode: "MEMILIKI_PENGAJUAN_IZIN",
          pesan: "Agenda tidak dapat dihapus karena memiliki riwayat pengajuan izin",
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      // Hapus sesi kosong setelah memastikan tidak ada rekaman presensi atau izin.
      await tx.sesiPresensi.deleteMany({ where: { agendaId } });
      await tx.agenda.delete({ where: { id: agendaId } });
    });

    revalidatePath(`/dashboard/proker/${agenda.prokerId}`);
    return { sukses: true, pesan: "Agenda berhasil dihapus" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal menghapus agenda",
      },
    };
  }
}
