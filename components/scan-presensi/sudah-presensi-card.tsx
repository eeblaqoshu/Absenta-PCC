// components/scan-presensi/sudah-presensi-card.tsx
"use client";

import { CheckCircle2 } from "lucide-react";
import { formatJamIndo } from "@/lib/waktu";
import type { PresensiSesiRingkas, SesiTersedia } from "./types";

interface Props {
  sesiDipilih: SesiTersedia | null;
  sudah: PresensiSesiRingkas;
}

export function SudahPresensiCard({ sesiDipilih, sudah }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-2">
      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
      <p className="text-sm font-bold text-emerald-800">
        Anda sudah presensi untuk sesi ini
      </p>
      <p className="text-xs text-emerald-700/80">
        {sesiDipilih?.judulAgenda} • {formatJamIndo(new Date(sudah.waktuScan))}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <span className="px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-emerald-700 border border-emerald-200">
          {sudah.status}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-slate-muted border border-[#E2E8F0]">
          jarak {sudah.jarakM} m
        </span>
        {sudah.diLuarRadius && (
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              sudah.statusVerifikasi === "ditolak"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : sudah.statusVerifikasi === "menunggu"
                  ? "bg-amber-50 text-[#8a6500] border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
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
      <p className="text-[11px] text-slate-muted pt-1">
        Pilih sesi lain di atas bila ada agenda lain yang masih dibuka.
      </p>
    </div>
  );
}
