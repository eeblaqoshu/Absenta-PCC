// lib/kehadiran.ts
// Rekap kehadiran peserta sah sebuah SESI presensi: siapa sudah absen, terlambat
// berapa menit, izin, atau alpa. Izin melekat pada agenda dan berlaku untuk
// seluruh sesi pada agenda tersebut; poin tetap dihitung per sesi (khusus Hari H).
import { prisma } from "./prisma";
import { ambilPesertaAgenda, type PesertaAgenda } from "./peserta";
import { hitungPoin } from "./poin";
import { jamDariWaktuAgenda } from "./waktu";
import {
  JenisAgenda,
  JenisIzin,
  StatusIzin,
  StatusPresensi,
  StatusVerifikasi,
  type TargetPeserta,
} from "@prisma/client";

export type StatusKehadiran =
  | "hadir"
  | "terlambat"
  | "izin_disetujui"
  | "izin_menunggu"
  | "alpa"
  | "ditolak";

export interface BarisKehadiran extends PesertaAgenda {
  presensiId: number | null;
  status: StatusPresensi | null;
  waktuScan: string | null;
  menitTerlambat: number;
  jarakM: number | null;
  diLuarRadius: boolean;
  statusVerifikasi: StatusVerifikasi | null;
  manual: boolean;
  izin: { id: number; jenis: JenisIzin; status: StatusIzin; alasan: string } | null;
  statusKehadiran: StatusKehadiran;
  /** Poin hanya bermakna bila sesi sudah ditutup & agenda jenis Hari H. */
  poin: number;
}

export interface RingkasanKehadiran {
  total: number;
  hadir: number;
  terlambat: number;
  izin: number;
  izinMenunggu: number;
  alpa: number;
  ditolak: number;
  perluVerifikasi: number;
}

export interface RekapKehadiranSesi {
  sesiId: number;
  agendaId: number;
  judulAgenda: string;
  jenisAgenda: JenisAgenda;
  tglPelaksanaan: string;
  tglSelesai: string | null;
  waktuPelaksanaan: string;
  lokasiNama: string | null;
  targetPeserta: TargetPeserta;
  namaProker: string;
  namaProkerId: number;
  periodeNama: string;
  bukaAt: string;
  tutupAt: string;
  /** Radius titik presensi agenda (null bila agenda belum punya titik). */
  radiusM: number | null;
  /** true bila tutup_at sudah lewat -> poin final. */
  sesiSudahDitutup: boolean;
  baris: BarisKehadiran[];
  ringkasan: RingkasanKehadiran;
}

export interface OpsiRekapKehadiran {
  /** Sertakan tanda tangan digital STO pada setiap baris peserta. */
  sertakanTtd?: boolean;
}

/** Hitung ringkasan dari daftar baris kehadiran. */
export function ringkasKehadiran(baris: BarisKehadiran[]): RingkasanKehadiran {
  return {
    total: baris.length,
    hadir: baris.filter((b) => b.statusKehadiran === "hadir").length,
    terlambat: baris.filter((b) => b.statusKehadiran === "terlambat").length,
    izin: baris.filter((b) => b.statusKehadiran === "izin_disetujui").length,
    izinMenunggu: baris.filter((b) => b.statusKehadiran === "izin_menunggu").length,
    alpa: baris.filter((b) => b.statusKehadiran === "alpa").length,
    ditolak: baris.filter((b) => b.statusKehadiran === "ditolak").length,
    perluVerifikasi: baris.filter((b) => b.statusVerifikasi === StatusVerifikasi.menunggu).length,
  };
}

/**
 * Rekap kehadiran satu sesi presensi. Pesertanya diambil dari aturan akses agenda
 * (`lib/akses.ts`), izin agenda berlaku pada seluruh sesi agenda tersebut.
 */
export async function rekapKehadiranSesi(
  sesiId: number,
  now: Date = new Date(),
  opsi?: OpsiRekapKehadiran
): Promise<RekapKehadiranSesi | null> {
  const sesi = await prisma.sesiPresensi.findUnique({
    where: { id: sesiId },
    select: {
      id: true,
      agendaId: true,
      bukaAt: true,
      tutupAt: true,
      agenda: {
        select: {
          id: true,
          judul: true,
          jenis: true,
          tglPelaksanaan: true,
          tglSelesai: true,
          waktuPelaksanaan: true,
          lokasiNama: true,
          targetPeserta: true,
          radiusM: true,
          proker: {
            select: {
              id: true,
              nama: true,
              periode: { select: { nama: true } },
            },
          },
        },
      },
    },
  });
  if (!sesi) return null;

  const peserta = await ambilPesertaAgenda(sesi.agendaId, {
    sertakanTtd: opsi?.sertakanTtd,
  });
  const [presensi, izin] = await Promise.all([
    prisma.presensi.findMany({
      where: { sesiId },
      select: {
        id: true,
        stoId: true,
        waktuScan: true,
        status: true,
        menitTerlambat: true,
        jarakM: true,
        diLuarRadius: true,
        statusVerifikasi: true,
        manual: true,
      },
    }),
    prisma.izin.findMany({
      where: { agendaId: sesi.agendaId },
      select: { id: true, stoId: true, jenis: true, status: true, alasan: true },
    }),
  ]);

  const presensiBySto = new Map(presensi.map((p) => [p.stoId, p]));
  const izinBySto = new Map(izin.map((i) => [i.stoId, i]));
  const sesiSudahDitutup = sesi.tutupAt < now;

  const baris: BarisKehadiran[] = peserta.map((p) => {
    const pr = presensiBySto.get(p.stoId) ?? null;
    const iz = izinBySto.get(p.stoId) ?? null;

    const presensiSah = pr && pr.statusVerifikasi !== "ditolak" ? pr : null;

    let statusKehadiran: StatusKehadiran;
    if (pr && pr.statusVerifikasi === "ditolak") {
      statusKehadiran = "ditolak";
    } else if (presensiSah && presensiSah.status) {
      statusKehadiran = presensiSah.status;
    } else if (iz?.status === StatusIzin.disetujui) {
      statusKehadiran = "izin_disetujui";
    } else if (iz?.status === StatusIzin.menunggu) {
      statusKehadiran = "izin_menunggu";
    } else {
      statusKehadiran = "alpa";
    }

    const poin = sesiSudahDitutup
      ? hitungPoin({
          status: presensiSah?.status ?? null,
          adaIzinDisetujui: iz?.status === StatusIzin.disetujui,
          jenisAgenda: sesi.agenda.jenis,
        })
      : 0;

    return {
      ...p,
      presensiId: pr?.id ?? null,
      status: pr?.status ?? null,
      waktuScan: pr ? pr.waktuScan.toISOString() : null,
      menitTerlambat: pr?.menitTerlambat ?? 0,
      jarakM: pr?.jarakM ?? null,
      diLuarRadius: pr?.diLuarRadius ?? false,
      statusVerifikasi: pr?.statusVerifikasi ?? null,
      manual: pr?.manual ?? false,
      izin: iz
        ? { id: iz.id, jenis: iz.jenis, status: iz.status, alasan: iz.alasan }
        : null,
      statusKehadiran,
      poin,
    };
  });

  return {
    sesiId: sesi.id,
    agendaId: sesi.agendaId,
    judulAgenda: sesi.agenda.judul,
    jenisAgenda: sesi.agenda.jenis,
    tglPelaksanaan: sesi.agenda.tglPelaksanaan.toISOString(),
    tglSelesai: sesi.agenda.tglSelesai
      ? sesi.agenda.tglSelesai.toISOString()
      : null,
    waktuPelaksanaan: jamDariWaktuAgenda(sesi.agenda.waktuPelaksanaan),
    lokasiNama: sesi.agenda.lokasiNama ?? null,
    targetPeserta: sesi.agenda.targetPeserta,
    namaProker: sesi.agenda.proker.nama,
    namaProkerId: sesi.agenda.proker.id,
    periodeNama: sesi.agenda.proker.periode.nama,
    bukaAt: sesi.bukaAt.toISOString(),
    tutupAt: sesi.tutupAt.toISOString(),
    radiusM: sesi.agenda.radiusM ?? null,
    sesiSudahDitutup,
    baris,
    ringkasan: ringkasKehadiran(baris),
  };
}

/** Rekap kehadiran untuk banyak sesi sekaligus (dipakai kartu agenda). */
export async function rekapKehadiranBanyakSesi(
  sesiIds: number[],
  now: Date = new Date()
): Promise<Map<number, RekapKehadiranSesi>> {
  const hasil = new Map<number, RekapKehadiranSesi>();
  await Promise.all(
    sesiIds.map(async (id) => {
      const rekap = await rekapKehadiranSesi(id, now, { sertakanTtd: false });
      if (rekap) hasil.set(id, rekap);
    })
  );
  return hasil;
}
