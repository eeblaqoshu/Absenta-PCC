// components/scan-presensi/scan-helpers.ts
import jsQR from "jsqr";
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

/**
 * Dekode QR dari berkas gambar (screenshot / foto / PNG hasil unduhan adsek).
 * Dicoba beberapa skala karena jsQR kesulitan pada gambar yang terlalu besar.
 */
export async function dekodeQrDariBerkas(berkas: File): Promise<string | null> {
  const gambar = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(berkas);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Berkas tidak bisa dibaca sebagai gambar. Gunakan PNG atau JPG."));
    };
    img.src = url;
  });

  const sisiTerpanjang = Math.max(gambar.naturalWidth, gambar.naturalHeight);
  if (!sisiTerpanjang) return null;

  const targetSkala = [1400, 1000, 700, 500];
  for (const target of targetSkala) {
    const skala = sisiTerpanjang > target ? target / sisiTerpanjang : 1;
    const lebar = Math.max(1, Math.round(gambar.naturalWidth * skala));
    const tinggi = Math.max(1, Math.round(gambar.naturalHeight * skala));

    const kanvas = document.createElement("canvas");
    kanvas.width = lebar;
    kanvas.height = tinggi;
    const konteks = kanvas.getContext("2d", { willReadFrequently: true });
    if (!konteks) throw new Error("Kanvas tidak tersedia di browser ini.");
    konteks.drawImage(gambar, 0, 0, lebar, tinggi);

    const piksel = konteks.getImageData(0, 0, lebar, tinggi);
    const kode = jsQR(piksel.data, lebar, tinggi, { inversionAttempts: "attemptBoth" });
    if (kode?.data) return kode.data;

    if (skala === 1 && sisiTerpanjang <= 500) break;
  }

  return null;
}
