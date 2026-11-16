// components/scan-presensi.tsx
// Halaman scan STO: peta Leaflet (posisi saya vs lingkaran radius sesi) + kamera QR.
// Semua keputusan presensi tetap di server; komponen ini hanya mengirim payload QR + koordinat.
//
// Catatan: jangan pernah "menelan" percobaan scan. Setiap percobaan harus memberi umpan balik
// (berhasil / alasan gagal), termasuk saat GPS belum siap atau kamera tidak bisa dibuka.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import jsQR from "jsqr";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { formatJamIndo } from "@/lib/waktu";
import { hitungJarakHaversine } from "@/lib/geo";
import "leaflet/dist/leaflet.css";
import {
  Loader2,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Navigation,
  CircleDot,
  ImageUp,
  LocateFixed,
  LogIn,
} from "lucide-react";

export interface PresensiSesiRingkas {
  status: "hadir" | "terlambat";
  waktuScan: string;
  jarakM: number;
  diLuarRadius: boolean;
  statusVerifikasi: "menunggu" | "diterima" | "ditolak";
}

export interface SesiTersedia {
  sesiId: number;
  agendaId: number;
  judulAgenda: string;
  namaProker: string;
  lokasiNama: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  bukaAt: string;
  tutupAt: string;
  /** Presensi STO pada sesi ini; null bila belum absen. */
  presensi: PresensiSesiRingkas | null;
}

interface Props {
  daftarSesi: SesiTersedia[];
}

interface Koordinat {
  lat: number;
  lng: number;
  akurasi: number;
  ts: number;
}

interface HasilScan {
  sukses: boolean;
  pesan: string;
  sesiId?: number;
  agendaJudul?: string;
  status?: "hadir" | "terlambat";
  jarakM?: number;
  radiusM?: number;
  diLuarRadius?: boolean;
  statusVerifikasi?: "menunggu" | "diterima" | "ditolak";
  waktuScan?: string;
  perluLogin?: boolean;
}

/** Menerjemahkan galat Geolocation API menjadi kalimat yang bisa ditindaklanjuti. */
function pesanGalatGps(err: GeolocationPositionError): string {
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
function ambilPosisiSekarang(): Promise<Omit<Koordinat, "ts">> {
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
function pesanGalatKamera(kind?: string): string {
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
async function dekodeQrDariBerkas(berkas: File): Promise<string | null> {
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

  // Coba ukuran wajar dulu, lalu perkecil supaya lebih cepat & lebih mudah dibaca.
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

export function ScanPresensi({ daftarSesi }: Props) {
  const [sesiDipilih, setSesiDipilih] = useState<SesiTersedia | null>(daftarSesi[0] ?? null);
  const [posisi, setPosisi] = useState<Omit<Koordinat, "ts"> | null>(null);
  const [gpsGalat, setGpsGalat] = useState<string | null>(null);
  const [kameraGalat, setKameraGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [pesanProses, setPesanProses] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilScan | null>(null);
  const [galatGambar, setGalatGambar] = useState<string | null>(null);
  const [namaBerkas, setNamaBerkas] = useState<string | null>(null);
  const [modalSukses, setModalSukses] = useState(false);

  // Salinan status presensi per sesi supaya UI langsung berubah setelah absen,
  // tanpa perlu memuat ulang halaman.
  const [presensiSaya, setPresensiSaya] = useState<Record<number, PresensiSesiRingkas>>(() => {
    const awal: Record<number, PresensiSesiRingkas> = {};
    for (const sesi of daftarSesi) {
      if (sesi.presensi) awal[sesi.sesiId] = sesi.presensi;
    }
    return awal;
  });

  const posisiRef = useRef<Koordinat | null>(null);
  const sedangKirim = useRef(false);
  const payloadTerakhir = useRef<string>("");

  // Perangkat tanpa GPS langsung ditandai di render (tanpa setState di efek).
  const dukungGps = typeof navigator === "undefined" || "geolocation" in navigator;

  // Jarak ke pusat sesi dihitung saat render; hanya untuk tampilan.
  const jarak =
    posisi && sesiDipilih
      ? hitungJarakHaversine(posisi.lat, posisi.lng, sesiDipilih.lat, sesiDipilih.lng)
      : null;

  // Presensi yang sudah tercatat untuk sesi yang sedang dipilih.
  const sudah = sesiDipilih ? (presensiSaya[sesiDipilih.sesiId] ?? null) : null;

  // ── Peta ──────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerSayaRef = useRef<Marker | null>(null);
  const circleSesiRef = useRef<Circle | null>(null);

  const simpanPosisi = useCallback((baru: Omit<Koordinat, "ts">) => {
    posisiRef.current = { ...baru, ts: Date.now() };
    setPosisi(baru);
  }, []);

  // ── GPS live ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dukungGps) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsGalat(null);
        simpanPosisi({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          akurasi: Math.round(pos.coords.accuracy),
        });
      },
      (err) => setGpsGalat(pesanGalatGps(err)),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [dukungGps, simpanPosisi]);

  // Bangun peta sekali
  useEffect(() => {
    let dibatalkan = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (dibatalkan || !containerRef.current || mapRef.current) return;

      const peta = L.map(containerRef.current, {
        center: [sesiDipilih?.lat ?? -6.9999, sesiDipilih?.lng ?? 110.42],
        zoom: 17,
        // Peta informasi: roda mouse hanya untuk scroll halaman.
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(peta);

      const ikonSesi = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const ikonSaya = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:#f43f5e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      if (sesiDipilih) {
        L.marker([sesiDipilih.lat, sesiDipilih.lng], { icon: ikonSesi }).addTo(peta);
        circleSesiRef.current = L.circle([sesiDipilih.lat, sesiDipilih.lng], {
          radius: sesiDipilih.radiusM,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(peta);
      }

      markerSayaRef.current = L.marker([peta.getCenter().lat, peta.getCenter().lng], {
        icon: ikonSaya,
        draggable: false,
      }).addTo(peta);

      mapRef.current = peta;
      setTimeout(() => peta.invalidateSize(), 100);
    })();

    return () => {
      dibatalkan = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerSayaRef.current = null;
      circleSesiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pindahkan penanda "saya" mengikuti GPS
  useEffect(() => {
    if (!posisi || !markerSayaRef.current || !mapRef.current) return;
    markerSayaRef.current.setLatLng([posisi.lat, posisi.lng]);
  }, [posisi]);

  // Ganti lingkaran saat sesi yang dipilih berubah
  useEffect(() => {
    const peta = mapRef.current;
    if (!peta || !sesiDipilih) return;

    (async () => {
      const L = (await import("leaflet")).default;
      circleSesiRef.current?.remove();
      circleSesiRef.current = L.circle([sesiDipilih.lat, sesiDipilih.lng], {
        radius: sesiDipilih.radiusM,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(peta);
      peta.setView([sesiDipilih.lat, sesiDipilih.lng], 17);
    })();
  }, [sesiDipilih]);

  /** Kirim satu payload QR ke server. Selalu memberi umpan balik ke pengguna. */
  const kirimPresensi = useCallback(
    async (payloadMentah: string) => {
      const payload = payloadMentah.trim();
      if (!payload) return;
      if (sedangKirim.current) return;
      if (payload === payloadTerakhir.current) return;

      sedangKirim.current = true;
      setMemproses(true);
      setHasil(null);
      setGalatGambar(null);

      try {
        let koordinat = posisiRef.current;

        if (!koordinat || Date.now() - koordinat.ts > 60_000) {
          setPesanProses("Mengambil titik GPS terbaru…");
          const baru = await ambilPosisiSekarang();
          simpanPosisi(baru);
          setGpsGalat(null);
          koordinat = { ...baru, ts: Date.now() };
        }

        setPesanProses("Memverifikasi presensi ke server…");

        const res = await fetch("/api/presensi/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr: payload, lat: koordinat.lat, lng: koordinat.lng }),
        });

        let json: {
          pesan?: string;
          sesiId?: number;
          agendaJudul?: string;
          status?: "hadir" | "terlambat";
          jarakM?: number;
          radiusM?: number;
          diLuarRadius?: boolean;
          statusVerifikasi?: "menunggu" | "diterima" | "ditolak";
          waktuScan?: string;
          error?: { kode?: string; pesan?: string };
        } = {};
        try {
          json = await res.json();
        } catch {
          json = {};
        }

        if (!res.ok) {
          setHasil({
            sukses: false,
            pesan: json?.error?.pesan ?? `Presensi gagal (kode ${res.status}).`,
            perluLogin: res.status === 401,
          });
        } else {
          // Simpan status ke daftar sesi supaya tampilan langsung berubah.
          if (typeof json.sesiId === "number" && json.status) {
            setPresensiSaya((prev) => ({
              ...prev,
              [json.sesiId as number]: {
                status: json.status as "hadir" | "terlambat",
                waktuScan: json.waktuScan ?? new Date().toISOString(),
                jarakM: json.jarakM ?? 0,
                diLuarRadius: Boolean(json.diLuarRadius),
                statusVerifikasi: json.statusVerifikasi ?? "diterima",
              },
            }));
          }

          setHasil({
            sukses: true,
            pesan: json.pesan ?? "Presensi berhasil dicatat.",
            sesiId: json.sesiId,
            agendaJudul: json.agendaJudul,
            status: json.status,
            jarakM: json.jarakM,
            radiusM: json.radiusM,
            diLuarRadius: json.diLuarRadius,
            statusVerifikasi: json.statusVerifikasi,
            waktuScan: json.waktuScan,
          });
          setModalSukses(true);
        }
      } catch (err) {
        setHasil({
          sukses: false,
          pesan:
            err instanceof Error
              ? err.message
              : "Gagal mengirim presensi. Periksa koneksi lalu coba lagi.",
        });
      } finally {
        sedangKirim.current = false;
        setMemproses(false);
        setPesanProses(null);
        payloadTerakhir.current = payload;
        // Izinkan payload yang sama dipindai ulang setelah jeda singkat.
        setTimeout(() => {
          if (payloadTerakhir.current === payload) payloadTerakhir.current = "";
        }, 5000);
      }
    },
    [simpanPosisi]
  );

  /** Baca QR dari gambar yang diunggah STO (mis. screenshot / PNG unduhan adsek). */
  const prosesGambarQr = useCallback(
    async (berkas: File) => {
      setHasil(null);
      setGalatGambar(null);
      setMemproses(true);
      setPesanProses("Membaca QR dari gambar…");

      try {
        const teks = await dekodeQrDariBerkas(berkas);

        if (!teks) {
          setHasil(null);
          setGalatGambar(
            "QR tidak terbaca dari gambar ini. Pastikan gambar tidak blur, tidak terpotong, dan QR memenuhi sebagian besar gambar."
          );
          return;
        }

        setPesanProses(null);
        setMemproses(false);
        // Payload yang sama boleh dikirim ulang walau sebelumnya sudah dicoba.
        payloadTerakhir.current = "";
        await kirimPresensi(teks);
      } catch (err) {
        setGalatGambar(err instanceof Error ? err.message : "Gagal membaca berkas gambar.");
      } finally {
        if (!sedangKirim.current) {
          setMemproses(false);
          setPesanProses(null);
        }
      }
    },
    [kirimPresensi]
  );

  /** Tombol "Ambil lokasi": berguna saat watchPosition gagal/timeout. */
  const ambilLokasiManual = useCallback(async () => {
    setGpsGalat(null);
    setPesanProses("Mengambil titik GPS…");
    try {
      simpanPosisi(await ambilPosisiSekarang());
    } catch (err) {
      setGpsGalat(err instanceof Error ? err.message : "Gagal membaca GPS.");
    } finally {
      setPesanProses(null);
    }
  }, [simpanPosisi]);

  if (daftarSesi.length === 0) {
    return (
      <div className="p-10 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Camera className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Tidak ada sesi presensi yang sedang dibuka
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Tunggu adsek membuka sesi presensi untuk agenda yang menjadi hak Anda.
        </p>
      </div>
    );
  }

  const diDalamRadius = jarak !== null && sesiDipilih !== null && jarak <= sesiDipilih.radiusM;

  return (
    <div className="space-y-5">
      {/* Pilih sesi */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Sesi presensi yang dibuka
        </label>
        <select
          value={sesiDipilih?.sesiId ?? ""}
          onChange={(e) => {
            const pilih = daftarSesi.find((s) => String(s.sesiId) === e.target.value) ?? null;
            setSesiDipilih(pilih);
            setHasil(null);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {daftarSesi.map((s) => (
            <option key={s.sesiId} value={s.sesiId}>
              {presensiSaya[s.sesiId] ? "✓ " : ""}
              {s.judulAgenda} — {s.namaProker}
            </option>
          ))}
        </select>

        {sesiDipilih && (
          <div className="text-[11px] text-zinc-500 space-y-0.5">
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              {sesiDipilih.lokasiNama ?? "Titik manual"} • radius {sesiDipilih.radiusM} m
            </p>
            <p>
              Buka {formatJamIndo(new Date(sesiDipilih.bukaAt))} • Tutup{" "}
              {formatJamIndo(new Date(sesiDipilih.tutupAt))}
            </p>
          </div>
        )}
      </div>

      {/* Status GPS + jarak */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            <Navigation className="w-3.5 h-3.5 text-blue-500" />
            {posisi
              ? `Posisi: ${posisi.lat.toFixed(5)}, ${posisi.lng.toFixed(5)} (±${posisi.akurasi} m)`
              : "Mencari sinyal GPS…"}
          </span>
          <div className="flex items-center gap-2">
            {jarak !== null && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  diDalamRadius
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" />
                {diDalamRadius ? `Dalam radius (${jarak} m)` : `Di luar radius (${jarak} m)`}
              </span>
            )}
            <button
              onClick={ambilLokasiManual}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              Ambil lokasi
            </button>
          </div>
        </div>

        {gpsGalat || !dukungGps ? (
          <p className="text-[11px] text-red-600 dark:text-red-400 mb-2 inline-flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {!dukungGps ? "Perangkat ini tidak mendukung GPS." : gpsGalat}
          </p>
        ) : null}

        <div
          ref={containerRef}
          style={{ height: "260px" }}
          className="peta-leaflet relative z-0 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800"
        />
        <p className="text-[11px] text-zinc-500 mt-2">
          Titik biru = pusat sesi, titik merah = posisi Anda. Presensi di luar radius tetap
          tercatat, lalu diverifikasi adsek.
        </p>
      </div>

      {/* Sudah presensi (tampilan berubah, bukan scan lagi) atau scanner */}
      {sudah ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
            Anda sudah presensi untuk sesi ini
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            {sesiDipilih?.judulAgenda} • {formatJamIndo(new Date(sudah.waktuScan))}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-emerald-950/60 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              {sudah.status}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-emerald-950/60 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              jarak {sudah.jarakM} m
            </span>
            {sudah.diLuarRadius && (
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  sudah.statusVerifikasi === "ditolak"
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900"
                    : sudah.statusVerifikasi === "menunggu"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900"
                }`}
              >
                di luar radius •{" "}
                {sudah.statusVerifikasi === "menunggu"
                  ? "menunggu verifikasi adsek"
                  : sudah.statusVerifikasi === "ditolak"
                    ? "ditolak adsek"
                    : "diterima adsek"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 pt-1">
            Pilih sesi lain di atas bila ada agenda lain yang masih dibuka.
          </p>
        </div>
      ) : (
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-3 inline-flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-500" />
          Pindai QR di layar adsek
        </h2>

        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
          <Scanner
            onScan={(codes) => {
              const raw = codes?.[0]?.rawValue;
              if (raw) kirimPresensi(raw);
            }}
            onError={(err) => setKameraGalat(pesanGalatKamera(err.kind))}
            paused={memproses}
            styles={{ container: { width: "100%" }, video: { width: "100%" } }}
          />
        </div>

        {kameraGalat && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 inline-flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {kameraGalat} Anda tetap bisa mengunggah gambar QR di bawah.
          </p>
        )}

        {/* Alternatif: unggah gambar QR dari galeri */}
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Atau unggah gambar QR dari galeri
          </label>
          <input
            type="file"
            accept="image/*"
            id="berkas-qr"
            className="hidden"
            onChange={(e) => {
              const berkas = e.target.files?.[0];
              if (!berkas) return;
              setNamaBerkas(berkas.name);
              prosesGambarQr(berkas);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="berkas-qr"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <ImageUp className="w-3.5 h-3.5" />
            Pilih gambar QR
          </label>
          <p className="text-[11px] text-zinc-500">
            Berguna kalau kamera tidak bisa dipakai. Gambar harus masih dalam jendela QR
            (maksimal 14 menit sejak QR ditampilkan).
          </p>
          {namaBerkas && <p className="text-[11px] text-zinc-500">Berkas: {namaBerkas}</p>}
          {galatGambar && (
            <p className="text-[11px] text-red-600 dark:text-red-400 inline-flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {galatGambar}
            </p>
          )}
        </div>

        {memproses && (
          <p className="mt-3 text-xs text-zinc-500 inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {pesanProses ?? "Memverifikasi presensi…"}
          </p>
        )}

        {hasil && (
          <div
            className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-xs ${
              hasil.sukses
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
            }`}
          >
            {hasil.sukses ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{hasil.pesan}</p>
              {hasil.sukses && (
                <p className="mt-0.5">
                  Status: <strong>{hasil.status}</strong>
                  {typeof hasil.jarakM === "number" && ` • jarak ${hasil.jarakM} m`}
                </p>
              )}
              {hasil.perluLogin && (
                <Link href="/login" className="mt-1 inline-flex items-center gap-1 underline">
                  <LogIn className="w-3 h-3" />
                  Login ulang
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Popup berhasil presensi */}
      {modalSukses && hasil?.sukses && (
        <Modal onClose={() => setModalSukses(false)} ariaLabel="Presensi berhasil">
          <div className="my-auto w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Presensi Berhasil
              </h3>
              <p className="text-xs text-zinc-500">
                {hasil.agendaJudul ?? sesiDipilih?.judulAgenda}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Status</p>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                  {hasil.status}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Jarak</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  {hasil.jarakM} m
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Waktu</p>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  {hasil.waktuScan ? formatJamIndo(new Date(hasil.waktuScan)) : "-"}
                </p>
              </div>
            </div>

            {hasil.diLuarRadius && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl px-3 py-2 leading-relaxed">
                Anda berada di luar radius {hasil.radiusM} m. Presensi tetap tercatat, tetapi
                menunggu verifikasi adsek sebelum kehadiran dianggap sah.
              </p>
            )}

            <button
              onClick={() => setModalSukses(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              Selesai
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
