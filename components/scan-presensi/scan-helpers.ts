// components/scan-presensi/scan-helpers.ts
import type { Koordinat } from "./types";

/** Menerjemahkan galat Geolocation API menjadi kalimat yang bisa ditindaklanjuti. */
export function pesanGalatGps(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Akses lokasi ditolak. Aktifkan izin lokasi untuk situs ini di browser, lalu coba lagi.";
  }
  if (err.code === err.POSITION_UNAVAILABLE) {
    return "Lokasi tidak tersedia. Pastikan GPS aktif dan Anda berada di area terbuka.";
  }
  if (err.code === err.TIMEOUT) {
    return "Pengambilan lokasi terlalu lama. Coba tekan tombol \"Ambil lokasi\".";
  }
  return "Gagal membaca GPS.";
}

/** Ambil satu titik GPS terbaru (dipakai saat scan, tanpa menunggu watchPosition). */
export function ambilPosisiSekarang(): Promise<Omit<Koordinat, "ts">> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Perangkat ini tidak mendukung GPS. Presensi tidak bisa dilakukan."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          akurasi: Math.round(pos.coords.accuracy),
        }),
      (err) => reject(new Error(pesanGalatGps(err))),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }
    );
  });
}

/** Pesan galat kamera yang bisa ditindaklanjuti (kind dari @yudiel/react-qr-scanner). */
export function pesanGalatKamera(kind?: string): string {
  switch (kind) {
    case "permission-denied":
      return "Akses kamera ditolak. Izinkan kamera untuk situs ini di browser, lalu muat ulang halaman.";
    case "insecure-context":
      return "Kamera hanya bisa dipakai lewat HTTPS (kecuali localhost).";
    case "no-camera":
      return "Kamera tidak ditemukan pada perangkat ini.";
    case "in-use":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
    case "overconstrained":
      return "Kamera tidak mendukung pengaturan yang diminta browser.";
    default:
      return "Kamera tidak dapat dibuka.";
  }
}
