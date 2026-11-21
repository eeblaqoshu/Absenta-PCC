// lib/waktu.ts
// Helper manipulasi dan pemformatan waktu zona Asia/Jakarta (WIB)
import { DEFAULT_TIMEZONE, BATAS_TERLAMBAT_MENIT } from "./konstanta";

/**
 * Menggabungkan Date (dari tgl_pelaksanaan) dan Time (dari waktu_pelaksanaan)
 * menjadi objek Date UTC yang tepat berdasarkan zona Asia/Jakarta (+07:00).
 */
export function gabungTanggalDanWaktu(
  tglPelaksanaan: Date,
  waktuPelaksanaan: Date
): Date {
  const tglStr = tglPelaksanaan.toISOString().split("T")[0]; // YYYY-MM-DD
  const jam = waktuPelaksanaan.getUTCHours().toString().padStart(2, "0");
  const menit = waktuPelaksanaan.getUTCMinutes().toString().padStart(2, "0");
  const detik = waktuPelaksanaan.getUTCSeconds().toString().padStart(2, "0");

  // ISO string dengan offset Jakarta (+07:00)
  return new Date(`${tglStr}T${jam}:${menit}:${detik}+07:00`);
}

/**
 * Format Date ke string tanggal bahasa Indonesia (contoh: "Senin, 10 November 2026")
 */
export function formatTanggalIndo(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Format Date ke string jam (contoh: "14:30 WIB")
 */
export function formatJamIndo(date: Date): string {
  const timeStr = new Intl.DateTimeFormat("id-ID", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${timeStr} WIB`;
}

/**
 * Mengubah input `datetime-local` (waktu lokal Asia/Jakarta) menjadi Date UTC.
 * Contoh input: "2026-11-15T16:30" -> 2026-11-15T09:30:00.000Z
 */
export function dariInputLokalWib(nilai: string): Date {
  // Nilai dari <input type="datetime-local"> belum punya zona waktu; anggap WIB (+07:00).
  const bersih = nilai.length === 16 ? `${nilai}:00` : nilai;
  return new Date(`${bersih}+07:00`);
}

/**
 * Mengubah Date UTC menjadi string untuk <input type="datetime-local"> dalam zona Asia/Jakarta.
 * Contoh: 2026-11-15T09:30:00.000Z -> "2026-11-15T16:30"
 */
export function keInputLokalWib(date: Date): string {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const ambil = (tipe: string) =>
    bagian.find((b) => b.type === tipe)?.value ?? "00";

  return `${ambil("year")}-${ambil("month")}-${ambil("day")}T${ambil("hour")}:${ambil("minute")}`;
}

/**
 * Menggabungkan tanggal agenda (DATE) dengan jam WIB "HH:mm" menjadi Date UTC.
 * Dipakai form sesi presensi: tanggal selalu mengikuti tanggal agenda.
 */
export function gabungTanggalDenganJamWib(tglPelaksanaan: Date, jam: string): Date {
  const tglStr = tglPelaksanaan.toISOString().split("T")[0]; // YYYY-MM-DD
  const bersih = jam.length === 5 ? `${jam}:00` : jam;
  return new Date(`${tglStr}T${bersih}+07:00`);
}

/** Jam sekarang dalam zona Asia/Jakarta, format "HH:mm". */
export function jamSekarangWib(now: Date = new Date()): string {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const ambil = (tipe: string) => bagian.find((b) => b.type === tipe)?.value ?? "00";
  return `${ambil("hour")}:${ambil("minute")}`;
}

/**
 * Menit keterlambatan dihitung terhadap jam maksimum kedatangan (tutupAt / jamMaksimal).
 * - Jika scan di antara jam mulai dan jam maksimal (waktuScan <= jamMaksimal): 0 menit (tidak terlambat / tepat waktu).
 * - Jika scan setelah jam maksimal (waktuScan > jamMaksimal): selisih menit keterlambatan (minimal 1 menit).
 */
export function hitungMenitTerlambat(jamMaksimal: Date, waktuScan: Date): number {
  if (waktuScan.getTime() <= jamMaksimal.getTime()) {
    return 0;
  }
  return Math.max(1, Math.floor((waktuScan.getTime() - jamMaksimal.getTime()) / 60_000));
}

/**
 * Status presensi dari menit keterlambatan:
 * - 0 menit -> `hadir` (tepat waktu).
 * - > 0 menit -> `terlambat`.
 */
export function statusDariMenitTerlambat(menitTerlambat: number): "hadir" | "terlambat" {
  return menitTerlambat <= 0 ? "hadir" : "terlambat";
}

export type StatusSesiDihitung = "belum_dibuka" | "berjalan" | "ditutup";

/**
 * Menghitung status sesi presensi (dihitung, tidak disimpan di database).
 * - Sebelum bukaAt: "belum_dibuka"
 * - Mulai bukaAt sampai akhir hari pelaksanaan sesi: "berjalan" (mengizinkan presensi tepat waktu maupun terlambat)
 * - Setelah hari pelaksanaan sesi berakhir: "ditutup"
 */
export function hitungStatusSesi(
  bukaAt: Date,
  tutupAt: Date,
  now: Date = new Date()
): StatusSesiDihitung {
  if (now < bukaAt) return "belum_dibuka";
  if (agendaTelahBerlalu(bukaAt, undefined, now)) return "ditutup";
  return "berjalan";
}

/**
 * Tanggal (YYYY-MM-DD) dalam zona Asia/Jakarta.
 */
export function tanggalWib(date: Date = new Date()): string {
  return keInputLokalWib(date).split("T")[0];
}

/**
 * true bila seluruh rentang tanggal agenda (WIB) sudah lewat.
 * Agenda multi-hari memakai `tglSelesai`; null berarti agenda sehari.
 */
export function agendaTelahBerlalu(
  tglMulai: Date,
  tglSelesai?: Date | null,
  now: Date = new Date()
): boolean {
  const tglAkhir = tglSelesai ?? tglMulai;
  return tanggalWib(new Date(tglAkhir)) < tanggalWib(now);
}

/**
 * Jam "HH:mm" dari kolom `waktu_pelaksanaan` agenda.
 * Nilai TIME disimpan apa adanya pada dummy Date 1970-01-01T<jam>Z, jadi dibaca
 * dengan `getUTCHours`/`getUTCMinutes` — JANGAN dikonversi ke WIB lagi (+7 akan salah).
 */
export function jamDariWaktuAgenda(waktuPelaksanaan: Date): string {
  const d = new Date(waktuPelaksanaan);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export type StatusAgendaDihitung = "akan_datang" | "sedang_berlangsung" | "selesai";

/**
 * Status agenda dihitung dari rentang tanggal + jam mulai agenda (bukan dari sesi):
 * - sebelum tanggal + jam mulai -> "akan_datang";
 * - di dalam rentang tanggal (sampai 23:59 WIB di tanggal terakhir) -> "sedang_berlangsung";
 * - setelah rentang berakhir -> "selesai".
 */
export function hitungStatusAgenda(
  tglMulai: Date,
  waktuMulai: Date,
  tglSelesai?: Date | null,
  now: Date = new Date()
): StatusAgendaDihitung {
  const mulaiAt = gabungTanggalDanWaktu(tglMulai, waktuMulai);
  const akhirAt = gabungTanggalDenganJamWib(tglSelesai ?? tglMulai, "23:59");

  if (now < mulaiAt) return "akan_datang";
  if (now <= akhirAt) return "sedang_berlangsung";
  return "selesai";
}
