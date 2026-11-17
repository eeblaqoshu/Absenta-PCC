// lib/rate-limit.ts
// Pembatas laju sederhana di memori proses (cukup untuk satu instance dev/prod kecil).
// Dipakai endpoint scan presensi supaya tidak bisa di-spam.
// Catatan: bukan pembatas terdistribusi. Kalau nanti deploy multi-instance,
// ganti ke penyimpanan bersama (Redis/DB) tanpa mengubah pemanggilnya.

const catatan = new Map<string, number[]>();

/**
 * @returns true kalau permintaan masih diizinkan, false kalau sudah melewati batas.
 */
export function cekBatasLaju(
  kunci: string,
  maks: number,
  jendelaMs: number,
  sekarangMs: number = Date.now()
): boolean {
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

/** Menghapus catatan laju untuk satu kunci (dipakai di tes/administrasi). */
export function resetBatasLaju(kunci?: string): void {
  if (kunci === undefined) {
    catatan.clear();
    return;
  }
  catatan.delete(kunci);
}
