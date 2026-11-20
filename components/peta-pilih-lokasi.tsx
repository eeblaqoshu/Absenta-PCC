// components/peta-pilih-lokasi.tsx
// Pemilih titik presensi di atas peta Leaflet (plain leaflet, dimuat dinamis di klien).
// Dipakai oleh form master lokasi dan form pembuatan sesi presensi.
"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  radiusM: number;
  onPilih: (lat: number, lng: number) => void;
  tinggi?: string;
}

export function PetaPilihLokasi({ lat, lng, radiusM, onPilih, tinggi = "260px" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const onPilihRef = useRef(onPilih);
  const [siap, setSiap] = useState(false);
  const [cariGps, setCariGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Simpan callback terbaru supaya tidak perlu membangun ulang peta.
  useEffect(() => {
    onPilihRef.current = onPilih;
  }, [onPilih]);

  // Bangun peta sekali.
  useEffect(() => {
    let dibatalkan = false;

    (async () => {
      const L = (await import("leaflet")).default;

      if (dibatalkan || !containerRef.current || mapRef.current) return;

      const peta = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 17,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(peta);

      const ikon = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([lat, lng], { draggable: true, icon: ikon }).addTo(peta);
      const lingkaran = L.circle([lat, lng], {
        radius: radiusM,
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.12,
        weight: 2,
      }).addTo(peta);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        lingkaran.setLatLng(pos);
        onPilihRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      peta.on("click", (e) => {
        marker.setLatLng(e.latlng);
        lingkaran.setLatLng(e.latlng);
        onPilihRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      });

      mapRef.current = peta;
      markerRef.current = marker;
      circleRef.current = lingkaran;
      setSiap(true);

      // Leaflet butuh tahu ukuran kontainer setelah render.
      setTimeout(() => peta.invalidateSize(), 100);
    })();

    return () => {
      dibatalkan = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // Sengaja hanya sekali; perubahan koordinat ditangani efek terpisah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan peta bila nilai dari luar berubah (mis. pilih lokasi master).
  useEffect(() => {
    const peta = mapRef.current;
    if (!peta || !markerRef.current || !circleRef.current) return;

    const posisiBaru: [number, number] = [lat, lng];
    const posisiKini = markerRef.current.getLatLng();
    if (posisiKini.lat !== lat || posisiKini.lng !== lng) {
      markerRef.current.setLatLng(posisiBaru);
      circleRef.current.setLatLng(posisiBaru);
      peta.setView(posisiBaru, peta.getZoom());
    }
  }, [lat, lng]);

  // Perbarui radius lingkaran.
  useEffect(() => {
    circleRef.current?.setRadius(radiusM);
  }, [radiusM]);

  function pakaiLokasiSaya() {
    if (!("geolocation" in navigator)) {
      setGpsError("Perangkat ini tidak mendukung GPS.");
      return;
    }
    setCariGps(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = Number(pos.coords.latitude.toFixed(6));
        const lo = Number(pos.coords.longitude.toFixed(6));
        onPilihRef.current(la, lo);
        markerRef.current?.setLatLng([la, lo]);
        circleRef.current?.setLatLng([la, lo]);
        mapRef.current?.setView([la, lo], 18);
        setCariGps(false);
      },
      () => {
        setGpsError("Gagal mengambil lokasi. Izinkan akses GPS di browser.");
        setCariGps(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-muted">
          <MapPin className="w-3.5 h-3.5" />
          Klik peta atau geser pin untuk menentukan titik pusat
        </span>
        <button
          type="button"
          onClick={pakaiLokasiSaya}
          disabled={cariGps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#CBD5E1] text-navy hover:bg-surface disabled:opacity-60 transition-colors"
        >
          {cariGps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          Pakai lokasi saya
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ height: tinggi }}
        className="peta-leaflet relative z-0 isolate w-full rounded-xl overflow-hidden border border-[#E2E8F0] bg-surface"
      >
        {!siap && (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-muted">
            Memuat peta…
          </div>
        )}
      </div>

      {gpsError && <p className="text-xs text-rose-600">{gpsError}</p>}

      <p className="text-xs text-slate-muted">
        {lat.toFixed(6)}, {lng.toFixed(6)} • radius {radiusM} m
      </p>
    </div>
  );
}
