// lib/actions/izin.ts
// Pengajuan izin STO per agenda dan peninjauannya oleh adsek.
"use server";

import { prisma } from "@/lib/prisma";
import { requireSto, requireAdsek } from "@/lib/auth";
import { bolehAkses } from "@/lib/akses";
import { revalidatePath } from "next/cache";
import { StatusIzin } from "@prisma/client";
import { z } from "zod";
import { hitungStatusAgenda } from "@/lib/waktu";

const AjukanIzinSchema = z.object({
  agendaId: z.coerce.number().int().positive(),
  jenis: z.enum(["terlambat", "sakit", "izin", "lainnya"]).default("izin"),
  alasan: z
    .string()
    .trim()
    .min(5, "Alasan izin minimal 5 karakter")
    .max(500, "Alasan izin maksimal 500 karakter"),
});

export async function ajukanIzinAction(prevState: unknown, formData: FormData) {
  try {
    const sto = await requireSto();

    const parsed = AjukanIzinSchema.safeParse({
      agendaId: formData.get("agendaId"),
      jenis: formData.get("jenis") ?? "izin",
      alasan: formData.get("alasan"),
    });
    if (!parsed.success) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message } };
    }
    const { agendaId, jenis, alasan } = parsed.data;

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      select: {
        id: true,
        tglPelaksanaan: true,
        tglSelesai: true,
        waktuPelaksanaan: true,
        proker: { select: { periodeId: true, periode: { select: { status: true } } } },
      },
    });

    if (!agenda) {
      return { error: { kode: "AGENDA_TIDAK_DITEMUKAN", pesan: "Agenda tidak ditemukan" } };
    }
    if (agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Periode kepengurusan agenda ini sudah selesai dan bersifat read-only",
        },
      };
    }
    if (agenda.proker.periodeId !== sto.periodeId) {
      return { error: { kode: "TIDAK_BERHAK", pesan: "Agenda ini bukan milik periode kepengurusan Anda" } };
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
          kode: "AGENDA_SUDAH_SELESAI",
          pesan: "Izin hanya dapat diajukan sebelum atau selama agenda berlangsung",
        },
      };
    }
    const akses = await bolehAkses(sto.id, agenda.id);
    if (!akses.boleh) {
      return { error: { kode: "TIDAK_BERHAK", pesan: akses.alasan ?? "Anda tidak berhak atas agenda ini" } };
    }

    const izinLama = await prisma.izin.findUnique({
      where: { agendaId_stoId: { agendaId, stoId: sto.id } },
    });

    if (izinLama?.status === StatusIzin.disetujui) {
      return {
        error: {
          kode: "IZIN_SUDAH_DISETUJUI",
          pesan: "Izin untuk agenda ini sudah disetujui, hubungi adsek bila ingin diubah",
        },
      };
    }

    await prisma.izin.upsert({
      where: { agendaId_stoId: { agendaId, stoId: sto.id } },
      create: { agendaId, stoId: sto.id, jenis, alasan, status: StatusIzin.menunggu },
      update: {
        jenis,
        alasan,
        status: StatusIzin.menunggu,
        ditinjauOleh: null,
        ditinjauAt: null,
      },
    });

    revalidatePath("/izin");
    revalidatePath("/home");
    revalidatePath("/dashboard/izin");
    revalidatePath("/dashboard/leaderboard");
    revalidatePath("/dashboard");

    return { sukses: true, pesan: "Pengajuan izin terkirim, menunggu peninjauan adsek" };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal mengajukan izin" } };
  }
}

export async function batalIzinAction(izinId: number) {
  try {
    const sto = await requireSto();

    const izin = await prisma.izin.findUnique({
      where: { id: izinId },
      include: {
        agenda: { select: { proker: { select: { periode: { select: { status: true } } } } } },
      },
    });

    if (!izin || izin.stoId !== sto.id) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Pengajuan izin tidak ditemukan" } };
    }
    if (izin.agenda.proker.periode.status === "selesai") {
      return { error: { kode: "PERIODE_READ_ONLY", pesan: "Periode sudah selesai dan read-only" } };
    }
    if (izin.status === StatusIzin.disetujui) {
      return {
        error: { kode: "IZIN_SUDAH_DISETUJUI", pesan: "Izin yang sudah disetujui tidak bisa dibatalkan sendiri" },
      };
    }

    await prisma.izin.delete({ where: { id: izinId } });

    revalidatePath("/izin");
    revalidatePath("/home");
    revalidatePath("/dashboard/izin");
    return { sukses: true, pesan: "Pengajuan izin dibatalkan" };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal membatalkan izin" } };
  }
}

const TinjauIzinSchema = z.object({
  izinId: z.coerce.number().int().positive(),
  keputusan: z.enum(["disetujui", "ditolak"]),
});

export async function tinjauIzinAction(izinId: number, keputusan: "disetujui" | "ditolak") {
  try {
    const adsek = await requireAdsek();

    const parsed = TinjauIzinSchema.safeParse({ izinId, keputusan });
    if (!parsed.success) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message } };
    }

    const izin = await prisma.izin.findUnique({
      where: { id: parsed.data.izinId },
      include: {
        agenda: { select: { proker: { select: { periode: { select: { status: true } } } } } },
      },
    });

    if (!izin) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Pengajuan izin tidak ditemukan" } };
    }
    if (izin.agenda.proker.periode.status === "selesai") {
      return { error: { kode: "PERIODE_READ_ONLY", pesan: "Periode sudah selesai dan read-only" } };
    }

    await prisma.izin.update({
      where: { id: izin.id },
      data: {
        status: parsed.data.keputusan === "disetujui" ? StatusIzin.disetujui : StatusIzin.ditolak,
        ditinjauOleh: adsek.id,
        ditinjauAt: new Date(),
      },
    });

    revalidatePath("/dashboard/izin");
    revalidatePath("/izin");
    revalidatePath("/dashboard/leaderboard");
    revalidatePath("/dashboard");

    return {
      sukses: true,
      pesan:
        parsed.data.keputusan === "disetujui"
          ? "Izin disetujui"
          : "Izin ditolak; kehadiran tetap mengikuti presensi sesi",
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal meninjau izin" } };
  }
}
