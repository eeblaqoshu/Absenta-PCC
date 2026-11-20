// lib/rekap-poin.ts
// Rekap poin kehadiran seluruh STO pada periode aktif (basis leaderboard).
// Poin dihitung per sesi presensi yang sudah ditutup, memakai aturan di lib/poin.ts.
import { prisma } from "./prisma";
import { putuskanAkses } from "./akses";
import {
  hitungPoin,
  tentukanKategori,
  isKetuplakAtauWaketuplak,
  BOBOT_POIN,
  type KategoriPoin,
} from "./poin";
import { StatusIzin, StatusPeriode } from "@prisma/client";

export interface BarisLeaderboard {
  peringkat: number;
  stoId: number;
  nama: string;
  nim: string;
  divisi: string | null;
  poin: number;
  tepatWaktu: number;
  terlambat: number;
  alpa: number;
  izinTidakHadir: number;
  totalSesiWajib: number;
  bonusPeran?: number;
}

export interface RekapPoin {
  periodeNama: string | null;
  totalSesiDihitung: number;
  baris: BarisLeaderboard[];
}

/**
 * Leaderboard poin: satu baris per STO pada periode aktif.
 * Sesi yang dihitung hanya yang sudah ditutup (`tutup_at` < sekarang) agar poin tidak
 * berubah-ubah saat sesi masih berjalan.
 */
export async function hitungLeaderboard(
  periodeIdInput?: number,
  now: Date = new Date()
): Promise<RekapPoin> {
  const periode = periodeIdInput
    ? await prisma.periode.findUnique({ where: { id: periodeIdInput } })
    : await prisma.periode.findFirst({ where: { status: StatusPeriode.aktif } });

  if (!periode) {
    return { periodeNama: null, totalSesiDihitung: 0, baris: [] };
  }

  const [daftarSto, daftarProker] = await Promise.all([
    prisma.sto.findMany({
      where: { periodeId: periode.id },
      select: { id: true, nama: true, nim: true, divisi: true },
      orderBy: { nama: "asc" },
    }),
    prisma.proker.findMany({
      where: { periodeId: periode.id },
      select: { id: true },
    }),
  ]);

  const prokerIds = daftarProker.map((p) => p.id);
  if (prokerIds.length === 0 || daftarSto.length === 0) {
    return { periodeNama: periode.nama, totalSesiDihitung: 0, baris: [] };
  }

  const [kepanitiaan, agenda, sesiSelesai, izinDisetujui] = await Promise.all([
    prisma.kepanitiaan.findMany({
      where: { prokerId: { in: prokerIds } },
      select: { prokerId: true, stoId: true, peran: true, divisiPanitia: true },
    }),
    prisma.agenda.findMany({
      where: { prokerId: { in: prokerIds } },
      select: { id: true, prokerId: true, targetPeserta: true },
    }),
    prisma.sesiPresensi.findMany({
      where: { agenda: { prokerId: { in: prokerIds } }, tutupAt: { lt: now } },
      select: { id: true, agendaId: true },
    }),
    prisma.izin.findMany({
      where: {
        status: StatusIzin.disetujui,
        sesi: { agenda: { prokerId: { in: prokerIds } } },
      },
      select: { sesiId: true, stoId: true },
    }),
  ]);

  const agendaById = new Map(agenda.map((a) => [a.id, a]));
  const peranByKunci = new Map(
    kepanitiaan.map((k) => [`${k.prokerId}:${k.stoId}`, k.peran])
  );
  const izinSet = new Set(izinDisetujui.map((i) => `${i.sesiId}:${i.stoId}`));

  const sesiIds = sesiSelesai.map((s) => s.id);
  const presensi =
    sesiIds.length > 0
      ? await prisma.presensi.findMany({
          where: { sesiId: { in: sesiIds } },
          select: { sesiId: true, stoId: true, status: true, statusVerifikasi: true },
        })
      : [];

  // Presensi yang ditolak adsek (di luar radius) diperlakukan seperti tidak hadir.
  const statusByKunci = new Map(
    presensi
      .filter((p) => p.statusVerifikasi !== "ditolak")
      .map((p) => [`${p.sesiId}:${p.stoId}`, p.status])
  );

  const baris: BarisLeaderboard[] = daftarSto.map((sto) => {
    let poin = 0;
    let tepatWaktu = 0;
    let terlambat = 0;
    let alpa = 0;
    let izinTidakHadir = 0;
    let totalSesiWajib = 0;

    for (const sesi of sesiSelesai) {
      const agendaSesi = agendaById.get(sesi.agendaId);
      if (!agendaSesi) continue;

      const akses = putuskanAkses({
        targetPeserta: agendaSesi.targetPeserta,
        periodeSama: true, // STO & proker sama-sama dari periode yang sedang dihitung
        peran: peranByKunci.get(`${agendaSesi.prokerId}:${sto.id}`) ?? null,
      });
      if (!akses.boleh) continue;

      totalSesiWajib += 1;
      const status = statusByKunci.get(`${sesi.id}:${sto.id}`) ?? null;
      const adaIzin = izinSet.has(`${sesi.id}:${sto.id}`);

      poin += hitungPoin({ status, adaIzinDisetujui: adaIzin });

      const kategori: KategoriPoin = tentukanKategori({ status, adaIzinDisetujui: adaIzin });
      if (kategori === "tepat_waktu") tepatWaktu += 1;
      else if (kategori === "terlambat_tanpa_izin" || kategori === "terlambat_dengan_izin") {
        terlambat += 1;
      } else {
        alpa += 1;
        if (kategori === "alpa_dengan_izin") izinTidakHadir += 1;
      }
    }

    // 5. Bonus peran awal: ketuplak & waketuplak mendapat +2 poin
    let bonusPeran = 0;
    const peranKepanitiaanSto = kepanitiaan.filter((k) => k.stoId === sto.id);
    for (const k of peranKepanitiaanSto) {
      if (isKetuplakAtauWaketuplak(k.peran, k.divisiPanitia)) {
        bonusPeran += BOBOT_POIN.BONUS_KETUPLAK_WAKETUPLAK;
      }
    }
    poin += bonusPeran;

    return {
      peringkat: 0,
      stoId: sto.id,
      nama: sto.nama,
      nim: sto.nim,
      divisi: sto.divisi,
      poin,
      tepatWaktu,
      terlambat,
      alpa,
      izinTidakHadir,
      totalSesiWajib,
      bonusPeran,
    };
  });

  baris.sort((a, b) => b.poin - a.poin || a.nama.localeCompare(b.nama));
  baris.forEach((b, i) => {
    b.peringkat = i + 1;
  });

  return { periodeNama: periode.nama, totalSesiDihitung: sesiSelesai.length, baris };
}
