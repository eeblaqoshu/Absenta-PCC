// lib/akses.ts
// Aturan tunggal otorisasi hak akses STO terhadap agenda kegiatan (target_peserta).
import { prisma } from "./prisma";
import { PeranPanitia, TargetPeserta } from "@prisma/client";

export interface BolehAksesResult {
  boleh: boolean;
  alasan?: string;
}

/** Data yang dibutuhkan untuk memutuskan akses (tanpa query lagi). */
export interface KonteksAkses {
  targetPeserta: TargetPeserta;
  /** STO berada di periode kepengurusan yang sama dengan proker agenda. */
  periodeSama: boolean;
  /** Peran STO di kepanitiaan proker tsb; null kalau bukan panitia. */
  peran: PeranPanitia | null;
}

/**
 * Satu-satunya tempat aturan `target_peserta` diterjemahkan menjadi keputusan.
 * Dipakai `bolehAkses` (per agenda) dan rekap poin (banyak agenda sekaligus)
 * supaya logikanya tidak pernah terduplikasi.
 *
 * Aturan (PRD 5.3):
 * - semua_panitia_sto : semua STO pada periode proker tsb
 * - semua_panitia     : terdaftar di kepanitiaan proker tsb (peran apa pun)
 * - hanya_pj_pi       : terdaftar di kepanitiaan dan peran bukan 'anggota'
 */
export function putuskanAkses(konteks: KonteksAkses): BolehAksesResult {
  if (!konteks.periodeSama) {
    return {
      boleh: false,
      alasan: "Anda tidak terdaftar pada periode kepengurusan agenda ini",
    };
  }

  if (konteks.targetPeserta === TargetPeserta.semua_panitia_sto) {
    return { boleh: true };
  }

  if (konteks.peran === null) {
    return {
      boleh: false,
      alasan: "Agenda ini hanya untuk panitia program kerja tersebut",
    };
  }

  if (konteks.targetPeserta === TargetPeserta.semua_panitia) {
    return { boleh: true };
  }

  if (konteks.targetPeserta === TargetPeserta.hanya_pj_pi) {
    if (konteks.peran === "anggota") {
      return {
        boleh: false,
        alasan: "Agenda ini khusus untuk Koordinator/PJ Divisi dan Pengurus Inti (PI)",
      };
    }
    return { boleh: true };
  }

  return { boleh: false, alasan: "Akses tidak diizinkan" };
}

/**
 * Memeriksa apakah seorang STO berhak melihat atau melakukan presensi pada suatu agenda.
 *
 * @param stoId ID STO dari sesi yang login
 * @param agendaId ID agenda yang akan diakses
 */
export async function bolehAkses(
  stoId: number,
  agendaId: number
): Promise<BolehAksesResult> {
  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaId },
    include: {
      proker: {
        select: {
          id: true,
          periodeId: true,
        },
      },
    },
  });

  if (!agenda) {
    return { boleh: false, alasan: "Agenda tidak ditemukan" };
  }

  const sto = await prisma.sto.findUnique({
    where: { id: stoId },
    select: { periodeId: true },
  });

  const panitia =
    sto && sto.periodeId === agenda.proker.periodeId
      ? await prisma.kepanitiaan.findUnique({
          where: {
            prokerId_stoId: {
              prokerId: agenda.proker.id,
              stoId: stoId,
            },
          },
          select: { peran: true },
        })
      : null;

  return putuskanAkses({
    targetPeserta: agenda.targetPeserta,
    periodeSama: Boolean(sto && sto.periodeId === agenda.proker.periodeId),
    peran: panitia?.peran ?? null,
  });
}
