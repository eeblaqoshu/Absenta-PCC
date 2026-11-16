// components/dashboard/kehadiran-modal.tsx
// Modal popup daftar hadir STO untuk SATU sesi presensi (adsek).
// Status tiap peserta dihitung otomatis dari presensi + izin sesi (lib/kehadiran.ts).
"use client";

import Link from "next/link";
import {
  Users,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  CalendarClock,
} from "lucide-react";
import type { RekapKehadiranSesi, StatusKehadiran } from "@/lib/kehadiran";
import { formatJamIndo } from "@/lib/waktu";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";

const LABEL: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin disetujui",
  izin_menunggu: "Izin menunggu",
  alpa: "Alpa",
  ditolak: "Ditolak",
};

const GAYA: Record<StatusKehadiran, string> = {
  hadir: "bg-emerald-100 text-emerald-700",
  terlambat: "bg-amber-100 text-amber-700",
  izin_disetujui: "bg-secondary/10 text-secondary",
  izin_menunggu: "bg-accent/15 text-[#0b7f9a]",
  alpa: "bg-rose-100 text-rose-700",
  ditolak: "bg-[#E2E8F0] text-slate-muted",
};

interface Props {
  judulAgenda: string;
  namaProker: string;
  rekap?: RekapKehadiranSesi;
  onTutup: () => void;
}

export function KehadiranModal({ judulAgenda, namaProker, rekap, onTutup }: Props) {
  const r = rekap?.ringkasan;

  return (
    <Modal onClose={onTutup} ariaLabel="Daftar hadir STO" size="2xl">
      <ModalHeader
        title="Daftar Hadir STO"
        description={`${namaProker} • ${judulAgenda}`}
        icon={Users}
        onClose={onTutup}
      />

      <ModalBody className="space-y-3">
        {rekap && (
          <p className="inline-flex items-center gap-1 text-[11px] text-slate-muted">
            <CalendarClock className="h-3 w-3 text-secondary" />
            {formatJamIndo(new Date(rekap.bukaAt))}–{formatJamIndo(new Date(rekap.tutupAt))} WIB
          </p>
        )}

        {!rekap && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed text-amber-700">
              Data sesi tidak ditemukan. Muat ulang halaman lalu coba lagi.
            </p>
          </div>
        )}

        {r && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${GAYA.hadir}`}>Hadir {r.hadir}</span>
            <span className={`rounded-full px-2 py-0.5 ${GAYA.terlambat}`}>Telat {r.terlambat}</span>
            <span className={`rounded-full px-2 py-0.5 ${GAYA.izin_disetujui}`}>Izin {r.izin}</span>
            <span className={`rounded-full px-2 py-0.5 ${GAYA.alpa}`}>
              Alpa {r.alpa + r.ditolak}
            </span>
            {r.izinMenunggu > 0 && (
              <span className={`rounded-full px-2 py-0.5 ${GAYA.izin_menunggu}`}>
                Izin menunggu {r.izinMenunggu}
              </span>
            )}
            {r.perluVerifikasi > 0 && (
              <span className="rounded-full bg-highlight/15 px-2 py-0.5 text-[#8a6500]">
                {r.perluVerifikasi} perlu verifikasi
              </span>
            )}
            <span className="rounded-full bg-surface px-2 py-0.5 text-slate-muted">
              {r.total} peserta
            </span>
          </div>
        )}

        {!rekap || rekap.baris.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-muted">
            Tidak ada peserta sah untuk sesi ini.
          </p>
        ) : (
          <ul className="divide-y divide-[#E2E8F0] overflow-hidden rounded-xl border border-[#E2E8F0]">
            {rekap.baris.map((b) => (
              <li
                key={b.stoId}
                className="flex items-center justify-between gap-3 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-navy">{b.nama}</p>
                  <p className="text-[10px] text-slate-muted">
                    {b.nim} • {b.divisi ?? "Umum"}
                    {b.manual && " • manual"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {b.statusKehadiran === "terlambat" && b.menitTerlambat > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                      <Clock className="h-3 w-3" />+{b.menitTerlambat}m
                    </span>
                  )}
                  {b.izin && (
                    <span className="inline-flex items-center gap-1 text-[10px] capitalize text-slate-muted">
                      <FileText className="h-3 w-3" />
                      {b.izin.jenis}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${GAYA[b.statusKehadiran]}`}
                  >
                    {LABEL[b.statusKehadiran]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>

      <ModalFooter className="justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-muted">
          {rekap?.sesiSudahDitutup ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Sesi sudah ditutup — poin final
            </>
          ) : (
            <>
              <Clock className="h-3 w-3 text-secondary" /> Sesi belum ditutup
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTutup}
            className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-[11px] font-semibold text-navy transition-colors hover:bg-surface"
          >
            Tutup
          </button>
          {rekap && (
            <Link
              href={`/dashboard/presensi/${rekap.sesiId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-[11px] font-semibold text-white shadow-md shadow-secondary/25 transition-colors hover:bg-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Kelola &amp; Ekspor CSV
            </Link>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}
