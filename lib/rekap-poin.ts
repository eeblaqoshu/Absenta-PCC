// lib/rekap-poin.ts
// Rekap poin kehadiran seluruh STO pada periode aktif (basis leaderboard).
// Poin dihitung per bulan khusus pada kegiatan Hari H acara yang sesinya sudah ditutup,
// memakai aturan di lib/poin.ts. Rapat PJ, Rabes, dan Rakoor bernilai 0 poin.
import { prisma } from "./prisma";
import { putuskanAkses } from "./akses";
import {
  adalahAgendaBerpoin,
  hitungPoin,
  tentukanKategori,
  isKetuplakAtauWaketuplak,
  BOBOT_POIN,
  type KategoriPoin,
} from "./poin";
import { tanggalWib } from "./waktu";
import { JenisAgenda, StatusIzin, StatusPeriode } from "@prisma/client";

const NAMA_BULAN_INDO = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export interface OpsiBulanLeaderboard {
  /** Format "YYYY-MM" */
  nilai: string;
  /** Contoh: "November 2026" */
  label: string;
}

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
  bulanAktif: string;
  bulanAktifLabel: string;
  opsiBulan: OpsiBulanLeaderboard[];
  totalSesiDihitung: number;
  baris: BarisLeaderboard[];
}

export function formatLabelBulan(ym: string): string {
  if (ym === "semua") return "Semua Bulan (Akumulasi Periode)";
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return ym;
  const tahun = Number(match[1]);
  const bulanIdx = Number(match[2]) - 1;
  const namaBulan = NAMA_BULAN_INDO[bulanIdx];
  if (!namaBulan) return ym;
  return `${namaBulan} ${tahun}`;
}

function bangunDaftarBulanPeriode(
  tglMulai: Date,
  tglSelesai: Date,
  tambahanBulan: Iterable<string>
): OpsiBulanLeaderboard[] {
  const setBulan = new Set<string>();

  const mulaiStr = tglMulai.toISOString().slice(0, 7);
  const selesaiStr = tglSelesai.toISOString().slice(0, 7);
  const [mulaiY, mulaiM] = mulaiStr.split("-").map(Number);
  const [selesaiY, selesaiM] = selesaiStr.split("-").map(Number);

  if (!Number.isNaN(mulaiY) && !Number.isNaN(selesaiY)) {
    let y = mulaiY;
    let m = mulaiM;
    let guard = 0;
    while ((y < selesaiY || (y === selesaiY && m <= selesaiM)) && guard < 60) {
      setBulan.add(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      guard += 1;
    }
  }

  for (const b of tambahanBulan) {
    if (/^\d{4}-\d{2}$/.test(b)) {
      setBulan.add(b);
    }
  }

  return Array.from(setBulan)
    .sort()
    .map((nilai) => ({
      nilai,
      label: formatLabelBulan(nilai),
    }));
}

/**
 * Leaderboard poin per bulan (default: bulan berjalan dalam periode aktif, atau "semua").
 * Sesi yang dihitung HANYA sesi dari kegiatan `hari_h` yang sudah ditutup (`tutup_at` < sekarang).
 */
export async function hitungLeaderboard(
  periodeIdInput?: number,
  now: Date = new Date(),
  bulanFilter?: string
): Promise<RekapPoin> {
  const bulanSekarangWib = tanggalWib(now).slice(0, 7);

  const periode = periodeIdInput
    ? await prisma.periode.findUnique({ where: { id: periodeIdInput } })
    : await prisma.periode.findFirst({ where: { status: StatusPeriode.aktif } });

  if (!periode) {
    return {
      periodeNama: null,
      bulanAktif: bulanSekarangWib,
      bulanAktifLabel: formatLabelBulan(bulanSekarangWib),
      opsiBulan: [],
      totalSesiDihitung: 0,
      baris: [],
    };
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

  // Tentukan daftar bulan dari rentang periode + sesi yang ada
  const semuaSesiSelesai =
    prokerIds.length > 0
      ? await prisma.sesiPresensi.findMany({
          where: {
            agenda: {
              prokerId: { in: prokerIds },
              jenis: JenisAgenda.hari_h,
            },
            tutupAt: { lt: now },
          },
          select: { id: true, agendaId: true, bukaAt: true },
        })
      : [];

  const bulanDariSesi = semuaSesiSelesai.map((s) => tanggalWib(s.bukaAt).slice(0, 7));
  const opsiBulan = bangunDaftarBulanPeriode(
    periode.tglMulai,
    periode.tglSelesai,
    bulanDariSesi
  );

  let bulanAktif: string;
  if (bulanFilter === "semua") {
    bulanAktif = "semua";
  } else if (bulanFilter && /^\d{4}-\d{2}$/.test(bulanFilter)) {
    bulanAktif = bulanFilter;
    if (!opsiBulan.some((o) => o.nilai === bulanAktif)) {
      opsiBulan.push({ nilai: bulanAktif, label: formatLabelBulan(bulanAktif) });
      opsiBulan.sort((a, b) => a.nilai.localeCompare(b.nilai));
    }
  } else if (opsiBulan.some((o) => o.nilai === bulanSekarangWib)) {
    bulanAktif = bulanSekarangWib;
  } else if (opsiBulan.length > 0) {
    // Bila bulan sekarang di luar rentang periode, pilih bulan terdekat
    bulanAktif =
      bulanSekarangWib < opsiBulan[0].nilai
        ? opsiBulan[0].nilai
        : opsiBulan[opsiBulan.length - 1].nilai;
  } else {
    bulanAktif = bulanSekarangWib;
  }

  const bulanAktifLabel = formatLabelBulan(bulanAktif);

  if (daftarSto.length === 0) {
    return {
      periodeNama: periode.nama,
      bulanAktif,
      bulanAktifLabel,
      opsiBulan,
      totalSesiDihitung: 0,
      baris: [],
    };
  }

  if (prokerIds.length === 0) {
    const barisKosong: BarisLeaderboard[] = daftarSto.map((sto, idx) => ({
      peringkat: idx + 1,
      stoId: sto.id,
      nama: sto.nama,
      nim: sto.nim,
      divisi: sto.divisi,
      poin: 0,
      tepatWaktu: 0,
      terlambat: 0,
      alpa: 0,
      izinTidakHadir: 0,
      totalSesiWajib: 0,
      bonusPeran: 0,
    }));
    return {
      periodeNama: periode.nama,
      bulanAktif,
      bulanAktifLabel,
      opsiBulan,
      totalSesiDihitung: 0,
      baris: barisKosong,
    };
  }

  const [kepanitiaan, agenda, izinDisetujui] = await Promise.all([
    prisma.kepanitiaan.findMany({
      where: { prokerId: { in: prokerIds } },
      select: { prokerId: true, stoId: true, peran: true, divisiPanitia: true },
    }),
    prisma.agenda.findMany({
      where: { prokerId: { in: prokerIds } },
      select: {
        id: true,
        prokerId: true,
        jenis: true,
        tglPelaksanaan: true,
        targetPeserta: true,
      },
    }),
    prisma.izin.findMany({
      where: {
        status: StatusIzin.disetujui,
        agenda: { prokerId: { in: prokerIds } },
      },
      select: { agendaId: true, stoId: true },
    }),
  ]);

  const agendaById = new Map(agenda.map((a) => [a.id, a]));
  const peranByKunci = new Map(
    kepanitiaan.map((k) => [`${k.prokerId}:${k.stoId}`, k.peran])
  );
  const izinSet = new Set(izinDisetujui.map((i) => `${i.agendaId}:${i.stoId}`));

  // Filter sesi Hari H sesuai bulan yang dipilih
  const sesiDihitung = semuaSesiSelesai.filter((s) => {
    const ag = agendaById.get(s.agendaId);
    if (!ag || !adalahAgendaBerpoin(ag.jenis)) return false;
    if (bulanAktif === "semua") return true;
    return tanggalWib(s.bukaAt).slice(0, 7) === bulanAktif;
  });

  // Proker yang memiliki acara Hari H pada bulan yang dipilih (untuk bonus peran Ketuplak/Waketuplak)
  const prokerAktifDiBulan = new Set<number>();
  if (bulanAktif === "semua") {
    for (const pid of prokerIds) prokerAktifDiBulan.add(pid);
  } else {
    for (const s of sesiDihitung) {
      const ag = agendaById.get(s.agendaId);
      if (ag) prokerAktifDiBulan.add(ag.prokerId);
    }
    for (const ag of agenda) {
      if (
        adalahAgendaBerpoin(ag.jenis) &&
        ag.tglPelaksanaan.toISOString().slice(0, 7) === bulanAktif
      ) {
        prokerAktifDiBulan.add(ag.prokerId);
      }
    }
  }

  const sesiIds = sesiDihitung.map((s) => s.id);
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

    for (const sesi of sesiDihitung) {
      const agendaSesi = agendaById.get(sesi.agendaId);
      if (!agendaSesi) continue;

      const akses = putuskanAkses({
        targetPeserta: agendaSesi.targetPeserta,
        periodeSama: true,
        peran: peranByKunci.get(`${agendaSesi.prokerId}:${sto.id}`) ?? null,
      });
      if (!akses.boleh) continue;

      totalSesiWajib += 1;
      const status = statusByKunci.get(`${sesi.id}:${sto.id}`) ?? null;
      const adaIzin = izinSet.has(`${sesi.agendaId}:${sto.id}`);

      poin += hitungPoin({
        status,
        adaIzinDisetujui: adaIzin,
        jenisAgenda: agendaSesi.jenis,
      });

      const kategori: KategoriPoin = tentukanKategori({
        status,
        adaIzinDisetujui: adaIzin,
        jenisAgenda: agendaSesi.jenis,
      });
      if (kategori === "tepat_waktu") tepatWaktu += 1;
      else if (kategori === "terlambat_tanpa_izin" || kategori === "terlambat_dengan_izin") {
        terlambat += 1;
      } else {
        alpa += 1;
        if (kategori === "alpa_dengan_izin") izinTidakHadir += 1;
      }
    }

    // Bonus peran Ketuplak & Waketuplak (+2 poin pada bulan pelaksanaan Hari H proker)
    let bonusPeran = 0;
    const peranKepanitiaanSto = kepanitiaan.filter(
      (k) => k.stoId === sto.id && prokerAktifDiBulan.has(k.prokerId)
    );
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

  return {
    periodeNama: periode.nama,
    bulanAktif,
    bulanAktifLabel,
    opsiBulan,
    totalSesiDihitung: sesiDihitung.length,
    baris,
  };
}
