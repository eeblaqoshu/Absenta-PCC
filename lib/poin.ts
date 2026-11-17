// lib/poin.ts
// Aturan poin kehadiran STO. Semua angka disimpan di satu tempat supaya mudah diubah.
import { StatusPresensi } from "@prisma/client";

/**
 * Bobot poin (ketentuan pemilik sistem).
 *
 * Kondisi dan poinnya:
 * - hadir tepat waktu (scan ≤ BATAS_TERLAMBAT_MENIT sejak buka) ............ 2
 * - hadir terlambat, tanpa izin disetujui ................................ -2
 * - hadir terlambat, ada izin disetujui ................................... 0
 * - tidak ada presensi (alpa), tanpa izin disetujui ...................... -2
 * - tidak ada presensi (alpa), ada izin disetujui ........................ 0
 *
 * `TERLAMBAT` (1) disimpan sebagai cadangan: kalau pemilik sistem memutuskan
 * "hadir terlambat tanpa izin = 1" (bukan -2), cukup ubah
 * `TERLAMBAT_TANPA_IZIN` menjadi `BOBOT_POIN.TERLAMBAT` di `hitungPoin`.
 */
export const BOBOT_POIN = {
  TEPAT_WAKTU: 2,
  TERLAMBAT: 1,
  TERLAMBAT_TANPA_IZIN: -2,
  TERLAMBAT_DENGAN_IZIN: 0,
  ALPA_TANPA_IZIN: -2,
  ALPA_DENGAN_IZIN: 0,
} as const;

export type KategoriPoin =
  | "tepat_waktu"
  | "terlambat_tanpa_izin"
  | "terlambat_dengan_izin"
  | "alpa_tanpa_izin"
  | "alpa_dengan_izin";

export interface KonteksPoin {
  /** Status presensi; null berarti tidak ada presensi (alpa). */
  status: StatusPresensi | null;
  /** true bila ada izin yang sudah disetujui adsek untuk agenda sesi ini. */
  adaIzinDisetujui: boolean;
}

/** Menentukan kategori poin dari satu sesi presensi. */
export function tentukanKategori({
  status,
  adaIzinDisetujui,
}: KonteksPoin): KategoriPoin {
  if (status === null) {
    return adaIzinDisetujui ? "alpa_dengan_izin" : "alpa_tanpa_izin";
  }

  if (status === StatusPresensi.hadir) {
    return "tepat_waktu";
  }

  return adaIzinDisetujui ? "terlambat_dengan_izin" : "terlambat_tanpa_izin";
}

/** Poin untuk satu kategori. */
export function poinDariKategori(kategori: KategoriPoin): number {
  switch (kategori) {
    case "tepat_waktu":
      return BOBOT_POIN.TEPAT_WAKTU;
    case "terlambat_tanpa_izin":
      return BOBOT_POIN.TERLAMBAT_TANPA_IZIN;
    case "terlambat_dengan_izin":
      return BOBOT_POIN.TERLAMBAT_DENGAN_IZIN;
    case "alpa_tanpa_izin":
      return BOBOT_POIN.ALPA_TANPA_IZIN;
    case "alpa_dengan_izin":
      return BOBOT_POIN.ALPA_DENGAN_IZIN;
  }
}

/** Poin untuk satu sesi presensi (satu STO). */
export function hitungPoin(konteks: KonteksPoin): number {
  return poinDariKategori(tentukanKategori(konteks));
}

/** Label bahasa Indonesia untuk tiap kategori (dipakai di UI). */
export const LABEL_KATEGORI: Record<KategoriPoin, string> = {
  tepat_waktu: "Tepat waktu",
  terlambat_tanpa_izin: "Terlambat tanpa izin",
  terlambat_dengan_izin: "Terlambat + izin",
  alpa_tanpa_izin: "Alpa tanpa izin",
  alpa_dengan_izin: "Alpa + izin",
};
