// lib/peserta.ts
// Daftar peserta (STO) yang berhak atas suatu agenda, diturunkan dari aturan
// `target_peserta` di lib/akses.ts (putuskanAkses). Dipakai halaman kehadiran
// adsek dan kartu agenda supaya tidak ada duplikasi aturan akses.
import { prisma } from "./prisma";
import { putuskanAkses } from "./akses";
import { PeranPanitia } from "@prisma/client";

export interface PesertaAgenda {
  stoId: number;
  nama: string;
  nim: string;
  divisi: string | null;
  peran: PeranPanitia | null;
}

/**
 * Kembalikan seluruh STO periode yang berhak atas agenda ini (termasuk yang
 * belum presensi), urut nama.
 */
export async function ambilPesertaAgenda(agendaId: number): Promise<PesertaAgenda[]> {
  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaId },
    select: {
      id: true,
      targetPeserta: true,
      prokerId: true,
      proker: { select: { periodeId: true } },
    },
  });
  if (!agenda) return [];

  const [daftarSto, kepanitiaan] = await Promise.all([
    prisma.sto.findMany({
      where: { periodeId: agenda.proker.periodeId },
      select: { id: true, nama: true, nim: true, divisi: true },
      orderBy: { nama: "asc" },
    }),
    prisma.kepanitiaan.findMany({
      where: { prokerId: agenda.prokerId },
      select: { stoId: true, peran: true },
    }),
  ]);

  const peranBySto = new Map(kepanitiaan.map((k) => [k.stoId, k.peran]));

  const hasil: PesertaAgenda[] = [];
  for (const sto of daftarSto) {
    const peran = peranBySto.get(sto.id) ?? null;
    const akses = putuskanAkses({
      targetPeserta: agenda.targetPeserta,
      periodeSama: true, // STO & proker sama-sama dari periode agenda
      peran,
    });
    if (akses.boleh) {
      hasil.push({ stoId: sto.id, nama: sto.nama, nim: sto.nim, divisi: sto.divisi, peran });
    }
  }
  return hasil;
}
