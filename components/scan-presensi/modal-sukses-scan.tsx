// components/scan-presensi/modal-sukses-scan.tsx
"use client";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { CheckCircle2 } from "lucide-react";
import { formatJamIndo } from "@/lib/waktu";
import type { HasilScan, SesiTersedia } from "./types";

interface Props {
  hasil: HasilScan;
  sesiDipilih: SesiTersedia | null;
  onClose: () => void;
}

export function ModalSuksesScan({ hasil, sesiDipilih, onClose }: Props) {
  return (
    <Modal onClose={onClose} ariaLabel="Presensi berhasil" size="sm">
      <ModalHeader
        title="Presensi Berhasil"
        description={hasil.agendaJudul ?? sesiDipilih?.judulAgenda}
        icon={CheckCircle2}
        onClose={onClose}
      />

      <ModalBody className="space-y-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-muted">Kehadiran Anda sudah tercatat di server.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-muted">Status</p>
            <p className="text-xs font-bold capitalize text-emerald-600">{hasil.status}</p>
          </div>
          <div className="rounded-xl bg-surface p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-muted">Jarak</p>
            <p className="text-xs font-bold text-navy">{hasil.jarakM} m</p>
          </div>
          <div className="rounded-xl bg-surface p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-muted">Waktu</p>
            <p className="text-xs font-bold text-navy">
              {hasil.waktuScan ? formatJamIndo(new Date(hasil.waktuScan)) : "-"}
            </p>
          </div>
        </div>

        {hasil.diLuarRadius && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-[#8a6500]">
            Anda berada di luar radius {hasil.radiusM} m. Presensi tetap tercatat, tetapi
            menunggu verifikasi adsek sebelum kehadiran dianggap sah.
          </p>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-secondary hover:bg-primary py-2.5 text-xs font-semibold text-white shadow-md shadow-secondary/25 transition-all cursor-pointer"
        >
          Selesai
        </button>
      </ModalFooter>
    </Modal>
  );
}
