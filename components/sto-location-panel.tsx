"use client";

import { useEffect, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";
import { LocateFixed, LoaderCircle, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

export interface TitikAgendaSto {
  id: number;
  judul: string;
  lokasi: string | null;
  lat: number;
  lng: number;
  radiusM: number;
}

interface Props {
  titikAgenda: TitikAgendaSto[];
}

export function StoLocationPanel({ titikAgenda }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const posisiSayaRef = useRef<Marker | null>(null);
  const radiusSayaRef = useRef<Circle | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let dibatalkan = false;
    let petaTerbuat: LeafletMap | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (dibatalkan || !containerRef.current) return;

      const titikAwal = titikAgenda[0];
      const peta = L.map(containerRef.current, {
        center: titikAwal ? [titikAwal.lat, titikAwal.lng] : [-2.5, 118],
        zoom: titikAwal ? 15 : 4,
        scrollWheelZoom: false,
      });
      petaTerbuat = peta;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(peta);

      titikAgenda.forEach((titik) => {
        L.circle([titik.lat, titik.lng], {
          radius: titik.radiusM,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.08,
          weight: 1.5,
        })
          .addTo(peta)
          .bindPopup(
            `<strong>${escapeHtml(titik.judul)}</strong><br/>${escapeHtml(titik.lokasi ?? "Lokasi agenda")}`,
          );
        L.circleMarker([titik.lat, titik.lng], {
          radius: 5,
          color: "#fff",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 1,
        })
          .addTo(peta)
          .bindTooltip(escapeHtml(titik.lokasi ?? titik.judul));
      });

      mapRef.current = peta;
      window.setTimeout(() => peta.invalidateSize(), 80);
    })();

    return () => {
      dibatalkan = true;
      petaTerbuat?.remove();
      mapRef.current = null;
      posisiSayaRef.current = null;
      radiusSayaRef.current = null;
    };
  }, [titikAgenda]);

  function cekLokasi() {
    if (!navigator.geolocation) {
      setPesan("Perangkat ini tidak mendukung lokasi.");
      return;
    }
    setMemuat(true);
    setPesan(null);
    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        const lat = posisi.coords.latitude;
        const lng = posisi.coords.longitude;
        void import("leaflet").then(({ default: L }) => {
          const peta = mapRef.current;
          if (!peta) return;
          const ikon = L.divIcon({
            className: "",
            html: '<span style="display:block;width:16px;height:16px;border:3px solid white;border-radius:50%;background:#0f172a;box-shadow:0 1px 6px #0005"></span>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          posisiSayaRef.current?.remove();
          radiusSayaRef.current?.remove();
          posisiSayaRef.current = L.marker([lat, lng], { icon: ikon })
            .addTo(peta)
            .bindTooltip("Lokasi saya")
            .openTooltip();
          radiusSayaRef.current = L.circle([lat, lng], {
            radius: Math.max(posisi.coords.accuracy, 20),
            color: "#0f172a",
            fillOpacity: 0.05,
            weight: 1,
          }).addTo(peta);
          peta.setView([lat, lng], 16);
          setMemuat(false);
        });
      },
      () => {
        setPesan("Lokasi tidak dapat diambil. Periksa izin lokasi browser.");
        setMemuat(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  return (
    <section className="relative z-0 isolate overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-navy">Lokasi agenda</h2>
          <p className="mt-0.5 text-xs text-slate-muted">
            {titikAgenda.length
              ? `${titikAgenda.length} titik presensi`
              : "Belum ada titik presensi"}
          </p>
        </div>
        <button
          type="button"
          onClick={cekLokasi}
          disabled={memuat}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 text-xs font-medium text-navy transition-colors hover:bg-surface disabled:opacity-60"
        >
          {memuat ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          {memuat ? "Mencari lokasi" : "Cek lokasi saya"}
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative z-0 isolate h-56 w-full bg-slate-100 sm:h-64"
        aria-label="Peta lokasi agenda"
      />
      {pesan && (
        <p role="status" className="px-4 py-2 text-xs text-rose-600">
          {pesan}
        </p>
      )}
      {titikAgenda.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-[#E2E8F0] px-4 py-2.5 scrollbar-none sm:px-5">
          {titikAgenda.slice(0, 4).map((titik) => (
            <span
              key={titik.id}
              className="inline-flex shrink-0 items-center gap-1.5 text-[11px] text-slate-muted"
            >
              <MapPin className="h-3 w-3 text-secondary" />
              {titik.lokasi || titik.judul}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}
