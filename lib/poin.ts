// lib/poin.ts
// Aturan poin kehadiran STO. Semua angka disimpan di satu tempat supaya mudah diubah.
import { StatusPresensi } from "@prisma/client";

/**
 * Bobot poin (ketentuan pemilik sistem):
 * - hadir tepat waktu (scan ≤ BATAS_TERLAMBAT_MENIT sejak buka) ............ +2
 * - hadir namun terlambat (scan presensi terlambat) ....................... +1
 * - tidak hadir / alpa, ada izin disetujui ................................ 0
 * - tidak hadir / alpa, tanpa izin disetujui ............................. -2
 * - bonus peran kepanitiaan Ketuplak & Waketuplak ........................ +2
 */
export const BOBOT_POIN = {
  TEPAT_WAKTU: 2,
  TERLAMBAT: 1,
  TERLAMBAT_TANPA_IZIN: 1, // Hadir namun terlambat tetap diakui hadir: +1
  TERLAMBAT_DENGAN_IZIN: 1, // Hadir namun terlambat: +1
  ALPA_TANPA_IZIN: -2,     // Tidak hadir / alpa tanpa izin: -2
  ALPA_DENGAN_IZIN: 0,      // Izin disetujui: 0
  BONUS_KETUPLAK_WAKETUPLAK: 2, // Bonus peran kepanitiaan awal: +2
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

/** Poin untuk satu kategori kehadiran sesi. */
export function poinDariKategori(kategori: KategoriPoin): number {
  switch (kategori) {
    case "tepat_waktu":
      return BOBOT_POIN.TEPAT_WAKTU; // +2
    case "terlambat_tanpa_izin":
      return BOBOT_POIN.TERLAMBAT_TANPA_IZIN; // +1
    case "terlambat_dengan_izin":
      return BOBOT_POIN.TERLAMBAT_DENGAN_IZIN; // +1
    case "alpa_tanpa_izin":
      return BOBOT_POIN.ALPA_TANPA_IZIN; // -2
    case "alpa_dengan_izin":
      return BOBOT_POIN.ALPA_DENGAN_IZIN; // 0
  }
}

/** Poin untuk satu sesi presensi (satu STO). */
export function hitungPoin(konteks: KonteksPoin): number {
  return poinDariKategori(tentukanKategori(konteks));
}

/** Mengecek apakah peran dalam kepanitiaan adalah Ketua Pelaksana atau Wakil Ketua Pelaksana */
export function isKetuplakAtauWaketuplak(
  peran: string | null | undefined,
  divisiPanitia: string | null | undefined,
): boolean {
  if (peran === "ketua") return true;
  const d = (divisiPanitia || "").toLowerCase();
  return (
    d.includes("ketua pelaksana") ||
    d.includes("wakil ketua") ||
    d.includes("ketuplak") ||
    d.includes("waketuplak")
  );
}

/** Label bahasa Indonesia untuk tiap kategori (dipakai di UI). */
export const LABEL_KATEGORI: Record<KategoriPoin, string> = {
  tepat_waktu: "Tepat waktu",
  terlambat_tanpa_izin: "Terlambat tanpa izin",
  terlambat_dengan_izin: "Terlambat + izin",
  alpa_tanpa_izin: "Alpa tanpa izin",
  alpa_dengan_izin: "Alpa + izin",
};
