// lib/actions/presensi.ts
// Verifikasi presensi yang dilakukan di luar radius oleh adsek.
// Radius tidak menggagalkan presensi (PRD 5.6 revisi), tetapi jaraknya ditandai
// supaya adsek memutuskan apakah kehadiran itu sah.
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { bolehAkses } from "@/lib/akses";
import { statusDariMenitTerlambat } from "@/lib/waktu";
import { revalidatePath } from "next/cache";
import { StatusVerifikasi } from "@prisma/client";

/**
 * Setujui atau tolak presensi yang berada di luar radius.
 * Presensi yang ditolak tetap tersimpan (tidak dihapus) dan tidak dihitung sebagai
 * kehadiran pada rekap poin.
 */
export async function verifikasiPresensiAction(
  presensiId: number,
  keputusan: "diterima" | "ditolak"
) {
  try {
    await requireAdsek();

    if (!Number.isInteger(presensiId) || presensiId <= 0) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "ID presensi tidak valid" } };
    }
    if (keputusan !== "diterima" && keputusan !== "ditolak") {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Keputusan verifikasi tidak valid" } };
    }

    const presensi = await prisma.presensi.findUnique({
      where: { id: presensiId },
      include: {
        sesi: {
          select: {
            id: true,
            agenda: {
              select: {
                proker: {
                  select: {
                    id: true,
                    periode: { select: { status: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!presensi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Presensi tidak ditemukan" } };
    }
    if (presensi.sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Periode kepengurusan ini sudah selesai dan bersifat read-only",
        },
      };
    }
    if (!presensi.diLuarRadius) {
      return {
        error: {
          kode: "TIDAK_PERLU_VERIFIKASI",
          pesan: "Presensi ini berada di dalam radius dan sudah sah",
        },
      };
    }

    await prisma.presensi.update({
      where: { id: presensi.id },
      data: {
        statusVerifikasi:
          keputusan === "diterima" ? StatusVerifikasi.diterima : StatusVerifikasi.ditolak,
      },
    });

    revalidatePath(`/dashboard/presensi/${presensi.sesi.id}`);
    revalidatePath(`/dashboard/proker/${presensi.sesi.agenda.proker.id}`);
    revalidatePath("/dashboard/leaderboard");
    revalidatePath("/dashboard");

    return {
      sukses: true,
      pesan:
        keputusan === "diterima"
          ? "Presensi di luar radius diterima"
          : "Presensi di luar radius ditolak, kehadiran tidak dihitung",
    };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal memverifikasi presensi" } };
  }
}

/**
 * Absensi manual oleh adsek: tandai seorang peserta sah sebagai hadir/terlambat
 * pada sebuah sesi tanpa scan QR. Menit keterlambatan diatur adsek.
 */
export async function catatPresensiManualAction(
  sesiId: number,
  stoId: number,
  menitTerlambatInput: number
) {
  try {
    await requireAdsek();

    const menitTerlambat = Number(menitTerlambatInput);
    if (!Number.isInteger(sesiId) || sesiId <= 0) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "ID sesi tidak valid" } };
    }
    if (!Number.isInteger(stoId) || stoId <= 0) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "ID STO tidak valid" } };
    }
    if (!Number.isInteger(menitTerlambat) || menitTerlambat < 0 || menitTerlambat > 1440) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Menit keterlambatan harus 0-1440" } };
    }

    const sesi = await prisma.sesiPresensi.findUnique({
      where: { id: sesiId },
      select: {
        id: true,
        agendaId: true,
        agenda: {
          select: {
            lat: true,
            lng: true,
            proker: { select: { id: true, periode: { select: { status: true } } } },
          },
        },
      },
    });
    if (!sesi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi presensi tidak ditemukan" } };
    }
    if (sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Periode kepengurusan ini sudah selesai dan bersifat read-only",
        },
      };
    }

    // Hanya peserta sah agenda ini yang boleh dicatatkan manual (aturan target_peserta).
    const akses = await bolehAkses(stoId, sesi.agendaId);
    if (!akses.boleh) {
      return {
        error: {
          kode: "TIDAK_BERHAK",
          pesan: akses.alasan ?? "STO ini tidak berhak atas agenda tersebut",
        },
      };
    }

    const sudahAda = await prisma.presensi.findUnique({
      where: { sesiId_stoId: { sesiId, stoId } },
      select: { id: true },
    });
    if (sudahAda) {
      return {
        error: {
          kode: "SUDAH_ABSEN",
          pesan: "STO ini sudah punya presensi di sesi ini; atur menit keterlambatannya saja",
        },
      };
    }

    if (sesi.agenda.lat === null || sesi.agenda.lng === null) {
      return {
        error: {
          kode: "LOKASI_AGENDA_BELUM_DIATUR",
          pesan: "Titik lokasi presensi agenda belum diatur",
        },
      };
    }

    await prisma.presensi.create({
      data: {
        sesiId,
        stoId,
        waktuScan: new Date(),
        // Titik presensi diambil dari agenda (sesi memakai titik agenda).
        lat: sesi.agenda.lat,
        lng: sesi.agenda.lng,
        jarakM: 0,
        status: statusDariMenitTerlambat(menitTerlambat),
        diLuarRadius: false,
        statusVerifikasi: StatusVerifikasi.diterima,
        menitTerlambat,
        manual: true,
      },
    });

    revalidatePath(`/dashboard/presensi/${sesiId}`);
    revalidatePath(`/dashboard/proker/${sesi.agenda.proker.id}`);
    revalidatePath("/dashboard/leaderboard");
    revalidatePath("/dashboard");
    revalidatePath("/home");

    return { sukses: true, pesan: "Kehadiran manual tersimpan" };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal mencatat kehadiran manual" } };
  }
}

/** Atur menit keterlambatan sebuah presensi; status hadir/terlambat ikut dihitung ulang. */
export async function aturMenitTerlambatAction(presensiId: number, menitTerlambatInput: number) {
  try {
    await requireAdsek();

    const menitTerlambat = Number(menitTerlambatInput);
    if (!Number.isInteger(presensiId) || presensiId <= 0) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "ID presensi tidak valid" } };
    }
    if (!Number.isInteger(menitTerlambat) || menitTerlambat < 0 || menitTerlambat > 1440) {
      return { error: { kode: "VALIDASI_GAGAL", pesan: "Menit keterlambatan harus 0-1440" } };
    }

    const presensi = await prisma.presensi.findUnique({
      where: { id: presensiId },
      include: {
        sesi: {
          select: {
            id: true,
            agenda: {
              select: { proker: { select: { id: true, periode: { select: { status: true } } } } },
            },
          },
        },
      },
    });
    if (!presensi) {
      return { error: { kode: "TIDAK_DITEMUKAN", pesan: "Presensi tidak ditemukan" } };
    }
    if (presensi.sesi.agenda.proker.periode.status === "selesai") {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Periode kepengurusan ini sudah selesai dan bersifat read-only",
        },
      };
    }

    await prisma.presensi.update({
      where: { id: presensiId },
      data: {
        menitTerlambat,
        status: statusDariMenitTerlambat(menitTerlambat),
      },
    });

    revalidatePath(`/dashboard/presensi/${presensi.sesi.id}`);
    revalidatePath(`/dashboard/proker/${presensi.sesi.agenda.proker.id}`);
    revalidatePath("/dashboard/leaderboard");
    revalidatePath("/dashboard");

    return { sukses: true, pesan: `Keterlambatan diatur ${menitTerlambat} menit` };
  } catch (err: unknown) {
    const error = err as Error;
    return { error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal mengatur keterlambatan" } };
  }
}
