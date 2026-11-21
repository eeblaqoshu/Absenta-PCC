// components/scan-presensi.tsx
// Halaman scan STO: peta Leaflet (posisi saya vs lingkaran radius sesi) + kamera QR.
// Semua keputusan presensi tetap di server; komponen ini hanya mengirim payload QR + koordinat.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import Link from "next/link";
import { formatJamIndo } from "@/lib/waktu";
import { hitungJarakHaversine } from "@/lib/geo";
import {
  Loader2,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Navigation,
  CircleDot,
  LocateFixed,
  LogIn,
} from "lucide-react";
import type {
  PresensiSesiRingkas,
  SesiTersedia,
  Koordinat,
  HasilScan,
} from "./scan-presensi/types";
import {
  pesanGalatGps,
  ambilPosisiSekarang,
  pesanGalatKamera,
} from "./scan-presensi/scan-helpers";
import { ScanLeafletMap } from "./scan-presensi/scan-leaflet-map";
import { ModalSuksesScan } from "./scan-presensi/modal-sukses-scan";
import { SudahPresensiCard } from "./scan-presensi/sudah-presensi-card";

// Re-export types untuk backwards-compatibility
export type { PresensiSesiRingkas, SesiTersedia, HasilScan };

interface Props {
  daftarSesi: SesiTersedia[];
}

export function ScanPresensi({ daftarSesi }: Props) {
  const router = useRouter();
  const [sesiDipilih, setSesiDipilih] = useState<SesiTersedia | null>(daftarSesi[0] ?? null);
  const [posisi, setPosisi] = useState<Omit<Koordinat, "ts"> | null>(null);
  const [gpsGalat, setGpsGalat] = useState<string | null>(null);
  const [kameraGalat, setKameraGalat] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [pesanProses, setPesanProses] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilScan | null>(null);
  const [modalSukses, setModalSukses] = useState(false);

  // Auto-refresh daftar sesi presensi secara real-time setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      if (!memproses && !modalSukses) {
        router.refresh();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router, memproses, modalSukses]);

  // Salinan status presensi per sesi
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

  const dukungGps = typeof navigator === "undefined" || "geolocation" in navigator;

  const jarak =
    posisi && sesiDipilih
      ? hitungJarakHaversine(posisi.lat, posisi.lng, sesiDipilih.lat, sesiDipilih.lng)
      : null;

  const sudah = sesiDipilih ? (presensiSaya[sesiDipilih.sesiId] ?? null) : null;

  const simpanPosisi = useCallback((baru: Omit<Koordinat, "ts">) => {
    posisiRef.current = { ...baru, ts: Date.now() };
    setPosisi(baru);
  }, []);

  // Watch GPS live
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

  const kirimPresensi = useCallback(
    async (payloadMentah: string) => {
      const payload = payloadMentah.trim();
      if (!payload) return;
      if (sedangKirim.current) return;
      if (payload === payloadTerakhir.current) return;

      sedangKirim.current = true;
      setMemproses(true);
      setHasil(null);

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
          body: JSON.stringify({
            qr: payload,
            lat: koordinat.lat,
            lng: koordinat.lng,
            akurasi: koordinat.akurasi,
          }),
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
        setTimeout(() => {
          if (payloadTerakhir.current === payload) payloadTerakhir.current = "";
        }, 5000);
      }
    },
    [simpanPosisi]
  );

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
      <div className="p-10 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white">
        <Camera className="w-10 h-10 text-slate-muted mx-auto mb-3" />
        <p className="text-sm font-semibold text-navy">
          Tidak ada sesi presensi yang sedang dibuka
        </p>
        <p className="text-xs text-slate-muted mt-1">
          Tunggu adsek membuka sesi presensi untuk agenda yang menjadi hak Anda.
        </p>
      </div>
    );
  }

  const diDalamRadius = jarak !== null && sesiDipilih !== null && jarak <= sesiDipilih.radiusM;

  return (
    <div className="space-y-5">
      {/* Pilih sesi */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-3">
        <label className="block text-xs font-semibold text-navy">
          Sesi presensi yang dibuka
        </label>
        <select
          value={sesiDipilih?.sesiId ?? ""}
          onChange={(e) => {
            const pilih = daftarSesi.find((s) => String(s.sesiId) === e.target.value) ?? null;
            setSesiDipilih(pilih);
            setHasil(null);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-secondary/30"
        >
          {daftarSesi.map((s) => (
            <option key={s.sesiId} value={s.sesiId}>
              {presensiSaya[s.sesiId] ? "✓ " : ""}
              {s.judulAgenda} — {s.namaProker}
            </option>
          ))}
        </select>

        {sesiDipilih && (
          <div className="text-[11px] text-slate-muted space-y-0.5">
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

      {/* Status GPS + peta */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy">
            <Navigation className="w-3.5 h-3.5 text-secondary" />
            {posisi
              ? `Posisi: ${posisi.lat.toFixed(5)}, ${posisi.lng.toFixed(5)} (±${posisi.akurasi} m)`
              : "Mencari sinyal GPS…"}
          </span>
          <div className="flex items-center gap-2">
            {jarak !== null && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                  diDalamRadius
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" />
                {diDalamRadius ? `Dalam radius (${jarak} m)` : `Di luar radius (${jarak} m)`}
              </span>
            )}
            <button
              onClick={ambilLokasiManual}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#CBD5E1] text-[11px] font-semibold text-navy hover:bg-surface transition-colors cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              Ambil lokasi
            </button>
          </div>
        </div>

        {gpsGalat || !dukungGps ? (
          <p className="text-[11px] text-rose-600 mb-2 inline-flex items-start gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {!dukungGps ? "Perangkat ini tidak mendukung GPS." : gpsGalat}
          </p>
        ) : null}

        <ScanLeafletMap sesiDipilih={sesiDipilih} posisi={posisi} />

        <p className="text-[11px] text-slate-muted mt-2">
          Titik biru = pusat sesi, titik merah = posisi Anda. Presensi hanya dapat dilakukan jika Anda berada di dalam radius lokasi kegiatan.
        </p>
      </div>

      {/* Sudah presensi vs Scanner */}
      {sudah ? (
        <SudahPresensiCard sesiDipilih={sesiDipilih} sudah={sudah} />
      ) : (
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
          <h2 className="text-sm font-bold text-primary mb-3 inline-flex items-center gap-2">
            <Camera className="w-4 h-4 text-secondary" />
            Pindai QR di layar adsek
          </h2>

          <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
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
            <p className="mt-2 text-[11px] text-rose-600 inline-flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {kameraGalat} Pastikan izin kamera aktif untuk memindai QR langsung.
            </p>
          )}

          {memproses && (
            <p className="mt-3 text-xs text-slate-muted inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {pesanProses ?? "Memverifikasi presensi…"}
            </p>
          )}

          {hasil && (
            <div
              className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-xs ${
                hasil.sukses
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
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

      {/* Modal Popup Berhasil */}
      {modalSukses && hasil?.sukses && (
        <ModalSuksesScan
          hasil={hasil}
          sesiDipilih={sesiDipilih}
          onClose={() => setModalSukses(false)}
        />
      )}
    </div>
  );
}
