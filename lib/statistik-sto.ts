// lib/statistik-sto.ts
// Logika pengambilan statistik kehadiran & riwayat sesi presensi yang telah selesai
import { prisma } from "./prisma";
import { putuskanAkses } from "./akses";
import {
  hitungPoin,
  tentukanKategori,
  isKetuplakAtauWaketuplak,
  BOBOT_POIN,
  type KategoriPoin,
} from "./poin";
import { formatTanggalIndo, formatJamIndo } from "./waktu";
import { StatusIzin, StatusVerifikasi } from "@prisma/client";

export interface RiwayatSesiSelesai {
  sesiId: number;
  agendaId: number;
  judulAgenda: string;
  namaProker: string;
  tanggalFormatted: string;
  jamLabel: string;
  lokasiNama: string | null;
  statusKategori: KategoriPoin;
  statusLabel: string;
  poin: number;
  waktuScanFormatted: string | null;
  menitTerlambat: number;
  izinInfo: {
    jenis: string;
    status: StatusIzin;
    alasan: string;
  } | null;
}

export interface StatistikSto {
  tepatWaktu: number;
  terlambat: number;
  izin: number;
  alpa: number;
  totalSesiWajib: number;
  totalPoin: number;
  bonusPeran?: number;
  riwayat: RiwayatSesiSelesai[];
}

/**
 * Mengambil ringkasan statistik dan daftar riwayat sesi yang telah selesai
 * khusus untuk seorang STO pada periode aktif.
 */
export async function ambilStatistikSto(
  stoId: number,
  periodeId: number,
  now: Date = new Date()
): Promise<StatistikSto> {
  // 1. Ambil seluruh proker di periode ini
  const prokerList = await prisma.proker.findMany({
    where: { periodeId },
    select: { id: true, nama: true },
  });

  const prokerIds = prokerList.map((p) => p.id);
  const prokerMap = new Map(prokerList.map((p) => [p.id, p.nama]));

  if (prokerIds.length === 0) {
    return {
      tepatWaktu: 0,
      terlambat: 0,
      izin: 0,
      alpa: 0,
      totalSesiWajib: 0,
      totalPoin: 0,
      riwayat: [],
    };
  }

  // 2. Ambil peran STO pada kepanitiaan proker di periode ini
  const kepanitiaanSto = await prisma.kepanitiaan.findMany({
    where: {
      prokerId: { in: prokerIds },
      stoId,
    },
    select: { prokerId: true, peran: true, divisiPanitia: true },
  });

  const peranByProker = new Map(kepanitiaanSto.map((k) => [k.prokerId, k.peran]));

  // 3. Ambil semua sesi presensi yang SUDAH SELESAI / BERAKHIR (tutupAt < now)
  const sesiSelesai = await prisma.sesiPresensi.findMany({
    where: {
      agenda: { prokerId: { in: prokerIds } },
      tutupAt: { lt: now },
    },
    include: {
      agenda: {
        select: {
          id: true,
          judul: true,
          prokerId: true,
          targetPeserta: true,
          lokasiNama: true,
          tglPelaksanaan: true,
          waktuPelaksanaan: true,
        },
      },
    },
    orderBy: { tutupAt: "desc" },
  });

  if (sesiSelesai.length === 0) {
    return {
      tepatWaktu: 0,
      terlambat: 0,
      izin: 0,
      alpa: 0,
      totalSesiWajib: 0,
      totalPoin: 0,
      riwayat: [],
    };
  }

  const sesiIds = sesiSelesai.map((s) => s.id);

  // 4. Ambil presensi & izin milik STO ini pada sesi-sesi tersebut
  const [presensiList, izinList] = await Promise.all([
    prisma.presensi.findMany({
      where: {
        sesiId: { in: sesiIds },
        stoId,
      },
      select: {
        sesiId: true,
        status: true,
        statusVerifikasi: true,
        waktuScan: true,
        menitTerlambat: true,
      },
    }),
    prisma.izin.findMany({
      where: {
        sesiId: { in: sesiIds },
        stoId,
      },
      select: {
        sesiId: true,
        jenis: true,
        status: true,
        alasan: true,
      },
    }),
  ]);

  const presensiMap = new Map(presensiList.map((p) => [p.sesiId, p]));
  const izinMap = new Map(izinList.map((i) => [i.sesiId, i]));

  let tepatWaktu = 0;
  let terlambat = 0;
  let izin = 0;
  let alpa = 0;
  let totalPoin = 0;
  let totalSesiWajib = 0;

  const riwayat: RiwayatSesiSelesai[] = [];

  for (const s of sesiSelesai) {
    // Periksa apakah STO berhak atas agenda sesi ini
    const akses = putuskanAkses({
      targetPeserta: s.agenda.targetPeserta,
      periodeSama: true,
      peran: peranByProker.get(s.agenda.prokerId) ?? null,
    });

    if (!akses.boleh) continue;

    totalSesiWajib += 1;

    const pr = presensiMap.get(s.id) ?? null;
    const iz = izinMap.get(s.id) ?? null;

    // Presensi yang ditolak adsek (misal di luar radius) dianggap tidak hadir
    const presensiSah = pr && pr.statusVerifikasi !== StatusVerifikasi.ditolak ? pr : null;
    const adaIzinDisetujui = iz?.status === StatusIzin.disetujui;

    const kategori: KategoriPoin = tentukanKategori({
      status: presensiSah?.status ?? null,
      adaIzinDisetujui,
    });

    const poinSesi = hitungPoin({
      status: presensiSah?.status ?? null,
      adaIzinDisetujui,
    });

    totalPoin += poinSesi;

    let statusLabel = "Tanpa Keterangan";
    if (kategori === "tepat_waktu") {
      tepatWaktu += 1;
      statusLabel = "Hadir Tepat Waktu";
    } else if (kategori === "terlambat_tanpa_izin" || kategori === "terlambat_dengan_izin") {
      terlambat += 1;
      statusLabel = kategori === "terlambat_dengan_izin" ? "Terlambat (Izin)" : "Terlambat";
    } else if (kategori === "alpa_dengan_izin") {
      izin += 1;
      statusLabel = `Izin (${iz?.jenis || "Disetujui"})`;
    } else {
      alpa += 1;
      statusLabel = "Tanpa Keterangan";
    }

    // Jika STO mengajukan izin tapi statusnya masih menunggu
    if (iz && iz.status === StatusIzin.menunggu && !presensiSah) {
      statusLabel = `Izin (${iz.jenis} - Menunggu Review)`;
    }

    riwayat.push({
      sesiId: s.id,
      agendaId: s.agenda.id,
      judulAgenda: s.agenda.judul,
      namaProker: prokerMap.get(s.agenda.prokerId) || "Program Kerja",
      tanggalFormatted: formatTanggalIndo(s.bukaAt),
      jamLabel: `${formatJamIndo(s.bukaAt)} – ${formatJamIndo(s.tutupAt)}`,
      lokasiNama: s.agenda.lokasiNama,
      statusKategori: kategori,
      statusLabel,
      poin: poinSesi,
      waktuScanFormatted: presensiSah ? formatJamIndo(presensiSah.waktuScan) : null,
      menitTerlambat: presensiSah?.menitTerlambat ?? 0,
      izinInfo: iz ? { jenis: iz.jenis, status: iz.status, alasan: iz.alasan } : null,
    });
  }

  // 5. Bonus peran Ketuplak / Waketuplak
  let bonusPeran = 0;
  for (const k of kepanitiaanSto) {
    if (isKetuplakAtauWaketuplak(k.peran, k.divisiPanitia)) {
      bonusPeran += BOBOT_POIN.BONUS_KETUPLAK_WAKETUPLAK;
    }
  }
  totalPoin += bonusPeran;

  return {
    tepatWaktu,
    terlambat,
    izin,
    alpa,
    totalSesiWajib,
    totalPoin,
    bonusPeran,
    riwayat,
  };
}
