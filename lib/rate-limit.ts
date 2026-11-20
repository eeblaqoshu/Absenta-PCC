// lib/rate-limit.ts
// Pembatas laju sederhana di memori proses dengan mekanisme auto-cleanup (mencegah memory leak).
// Dipakai endpoint scan presensi dan login auth.

const catatan = new Map<string, number[]>();

/** Interval pembersihan otomatis entri kedaluwarsa (setiap 5 menit). */
const INTERVAL_BERSIH_MS = 5 * 60 * 1000;
let timerBersih: NodeJS.Timeout | null = null;

function jadwalkanPembersihan() {
  if (timerBersih) return;
  timerBersih = setInterval(() => {
    bersihkanCatatanKedaluwarsa();
  }, INTERVAL_BERSIH_MS);
  // unref agar timer ini tidak menghalangi proses Node.js keluar (misalnya saat test)
  timerBersih.unref?.();
}

/** Bersihkan entri kedaluwarsa dari memori. */
export function bersihkanCatatanKedaluwarsa(sekarangMs: number = Date.now(), maxUmurMs: number = 60_000): void {
  const batas = sekarangMs - maxUmurMs;
  for (const [kunci, riwayat] of catatan.entries()) {
    const aktif = riwayat.filter((t) => t > batas);
    if (aktif.length === 0) {
      catatan.delete(kunci);
    } else {
      catatan.set(kunci, aktif);
    }
  }
}

/**
 * Memeriksa apakah permintaan masih dalam batas wajar.
 * @returns true jika diizinkan, false jika melewati batas laju.
 */
export function cekBatasLaju(
  kunci: string,
  maks: number,
  jendelaMs: number,
  sekarangMs: number = Date.now()
): boolean {
  jadwalkanPembersihan();

  // Jika ukuran memori catatan melebihi 2000 entri, lakukan pembersihan darurat
  if (catatan.size > 2000) {
    bersihkanCatatanKedaluwarsa(sekarangMs, jendelaMs);
  }

  const batasAwal = sekarangMs - jendelaMs;
  const riwayat = (catatan.get(kunci) ?? []).filter((t) => t > batasAwal);

  if (riwayat.length >= maks) {
    catatan.set(kunci, riwayat);
    return false;
  }

  riwayat.push(sekarangMs);
  catatan.set(kunci, riwayat);
  return true;
}

/** Menghapus catatan laju untuk satu kunci atau seluruhnya (dipakai di tes/administrasi). */
export function resetBatasLaju(kunci?: string): void {
  if (kunci === undefined) {
    catatan.clear();
    return;
  }
  catatan.delete(kunci);
}
