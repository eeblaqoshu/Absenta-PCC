// components/dashboard/kehadiran-modal.tsx
// Modal popup daftar hadir STO untuk SATU sesi presensi (adsek).
// Status tiap peserta dihitung otomatis dari presensi + izin sesi (lib/kehadiran.ts).
"use client";

import Link from "next/link";
import {
  X,
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
import { Modal } from "@/components/ui/modal";

const LABEL: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin disetujui",
  izin_menunggu: "Izin menunggu",
  alpa: "Alpa",
  ditolak: "Ditolak",
};

const GAYA: Record<StatusKehadiran, string> = {
  hadir: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  terlambat: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  izin_disetujui: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  izin_menunggu: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
  alpa: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  ditolak: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
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
    <Modal onClose={onTutup} ariaLabel="Daftar hadir STO">
      <div className="mx-auto flex max-h-full min-h-0 w-full max-w-2xl flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" />
              Daftar Hadir STO
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {namaProker} • {judulAgenda}
            </p>
            {rekap && (
              <p className="text-[11px] text-zinc-400 mt-1 inline-flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {formatJamIndo(new Date(rekap.bukaAt))}–{formatJamIndo(new Date(rekap.tutupAt))} WIB
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onTutup}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scrollbar-none p-5">
          {!rekap && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                Data sesi tidak ditemukan. Muat ulang halaman lalu coba lagi.
              </p>
            </div>
          )}

          {r && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
              <span className={`px-2 py-0.5 rounded-full ${GAYA.hadir}`}>Hadir {r.hadir}</span>
              <span className={`px-2 py-0.5 rounded-full ${GAYA.terlambat}`}>Telat {r.terlambat}</span>
              <span className={`px-2 py-0.5 rounded-full ${GAYA.izin_disetujui}`}>Izin {r.izin}</span>
              <span className={`px-2 py-0.5 rounded-full ${GAYA.alpa}`}>
                Alpa {r.alpa + r.ditolak}
              </span>
              {r.izinMenunggu > 0 && (
                <span className={`px-2 py-0.5 rounded-full ${GAYA.izin_menunggu}`}>
                  Izin menunggu {r.izinMenunggu}
                </span>
              )}
              {r.perluVerifikasi > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  {r.perluVerifikasi} perlu verifikasi
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {r.total} peserta
              </span>
            </div>
          )}

          {!rekap || rekap.baris.length === 0 ? (
            <p className="py-8 text-center text-xs text-zinc-500">Tidak ada peserta sah untuk sesi ini.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {rekap.baris.map((b) => (
                <li
                  key={b.stoId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                      {b.nama}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {b.nim} • {b.divisi ?? "Umum"}
                      {b.manual && " • manual"}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {b.statusKehadiran === "terlambat" && b.menitTerlambat > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />+{b.menitTerlambat}m
                      </span>
                    )}
                    {b.izin && (
                      <span className="text-[10px] text-zinc-500 capitalize inline-flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {b.izin.jenis}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${GAYA[b.statusKehadiran]}`}>
                      {LABEL[b.statusKehadiran]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 inline-flex items-center gap-1">
            {rekap?.sesiSudahDitutup ? (
              <>
                <CheckCircle2 className="w-3 h-3" /> Sesi sudah ditutup — poin final
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" /> Sesi belum ditutup
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTutup}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Tutup
            </button>
            {rekap && (
              <Link
                href={`/dashboard/presensi/${rekap.sesiId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Kelola &amp; Ekspor CSV
              </Link>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
