// components/scan-presensi/scan-leaflet-map.tsx
"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import type { Koordinat, SesiTersedia } from "./types";
import "leaflet/dist/leaflet.css";

interface Props {
  sesiDipilih: SesiTersedia | null;
  posisi: Omit<Koordinat, "ts"> | null;
}

export function ScanLeafletMap({ sesiDipilih, posisi }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerSayaRef = useRef<Marker | null>(null);
  const circleSesiRef = useRef<Circle | null>(null);

  // Inisialisasi peta sekali saat mount
  useEffect(() => {
    let dibatalkan = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (dibatalkan || !containerRef.current || mapRef.current) return;

      const peta = L.map(containerRef.current, {
        center: [sesiDipilih?.lat ?? -6.9999, sesiDipilih?.lng ?? 110.42],
        zoom: 17,
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
        L.marker([sesiDipilih.lat, sesiDipilih.lng], { icon: ikonSesi }).addTo(
          peta,
        );
        circleSesiRef.current = L.circle([sesiDipilih.lat, sesiDipilih.lng], {
          radius: sesiDipilih.radiusM,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(peta);
      }

      markerSayaRef.current = L.marker(
        [peta.getCenter().lat, peta.getCenter().lng],
        {
          icon: ikonSaya,
          draggable: false,
        },
      ).addTo(peta);

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

  // Update posisi marker user
  useEffect(() => {
    if (!posisi || !markerSayaRef.current || !mapRef.current) return;
    markerSayaRef.current.setLatLng([posisi.lat, posisi.lng]);
  }, [posisi]);

  // Update radius circle ketika sesi berubah
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

  return (
    <div
      ref={containerRef}
      style={{ height: "260px" }}
      className="peta-leaflet relative z-0 isolate w-full rounded-xl overflow-hidden border border-[#E2E8F0] bg-surface"
    />
  );
}
