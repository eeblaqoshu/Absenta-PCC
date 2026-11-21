// components/dashboard/daftar-kehadiran.tsx
// Tabel kelola kehadiran satu sesi (adsek): status per peserta, koreksi status/izin
// manual via dropdown, verifikasi radius, dan ekspor CSV.
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  catatStatusKehadiranManualAction,
  verifikasiPresensiAction,
  type PilihanStatusManual,
} from "@/lib/actions/presensi";
import { Download, Loader2, RefreshCw } from "lucide-react";
import type { RekapKehadiranSesi, StatusKehadiran } from "@/lib/kehadiran";

const LABEL: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin",
  izin_menunggu: "Izin",
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

function statusKePilihan(status: StatusKehadiran): PilihanStatusManual {
  if (status === "hadir") return "hadir";
  if (status === "terlambat") return "terlambat";
  if (status === "izin_disetujui" || status === "izin_menunggu") return "izin";
  return "alpa";
}

interface Props {
  sesiId: number;
  isReadonly: boolean;
  rekap: RekapKehadiranSesi;
}

export function DaftarKehadiran({ sesiId, isReadonly, rekap }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);
  const [prosesId, setProsesId] = useState<string | null>(null);

  // Auto-refresh daftar kehadiran real-time setiap 4 detik saat sesi dibuka
  useEffect(() => {
    if (isReadonly) return;

    const interval = setInterval(() => {
      if (!isPending && !prosesId) {
        router.refresh();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [router, isPending, prosesId, isReadonly]);

  function jalankan(kunci: string, aksi: () => Promise<{ error?: { pesan: string }; pesan?: string }>) {
    setPesan(null);
    setProsesId(kunci);
    startTransition(async () => {
      const hasil = await aksi();
      setProsesId(null);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Tersimpan" });
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-primary">
            Kelola Kehadiran Peserta
          </h2>
          <p className="text-xs text-slate-muted mt-0.5">
            {rekap.namaProker} • {rekap.judulAgenda}
            {rekap.sesiSudahDitutup ? " • sesi sudah ditutup (poin final)" : " • sesi belum ditutup"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isReadonly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200/60 text-[10px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time aktif
            </span>
          )}
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-[11px] font-semibold text-navy hover:bg-surface cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat ulang
          </button>
          <a
            href={`/api/presensi/export?sesiId=${sesiId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary text-white text-[11px] font-semibold shadow-md shadow-secondary/25 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </a>
        </div>
      </div>

      {pesan && (
        <p
          className={`text-[11px] ${
            pesan.tipe === "sukses" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="overflow-x-auto scrollbar-none" data-lenis-prevent-horizontal>
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-3 py-3">Peserta</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Atur Status (Manual)</th>
              <th className="px-3 py-3">Radius</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rekap.baris.map((b) => (
              <tr key={b.stoId} className="align-middle">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="font-semibold text-navy">{b.nama}</div>
                  <div className="text-[10px] text-slate-muted">
                    {b.nim} • {b.divisi ?? "Umum"}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${GAYA[b.statusKehadiran]}`}>
                    {LABEL[b.statusKehadiran]}
                  </span>
                  {b.statusKehadiran === "terlambat" && b.menitTerlambat > 0 && (
                    <span className="ml-1 text-[10px] text-amber-700 font-semibold">
                      ({b.menitTerlambat}m)
                    </span>
                  )}
                  {b.manual && <span className="ml-1 text-[10px] text-slate-muted">manual</span>}
                  {rekap.sesiSudahDitutup && (
                    <span className="ml-1 text-[10px] text-slate-muted">({b.poin > 0 ? "+" : ""}{b.poin} poin)</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <BarisStatusManual
                    key={`${b.stoId}-${b.statusKehadiran}-${b.menitTerlambat}`}
                    statusAwal={statusKePilihan(b.statusKehadiran)}
                    menitAwal={b.menitTerlambat}
                    isReadonly={isReadonly}
                    sedangProses={prosesId === `status-${b.stoId}`}
                    onSimpan={(status, menit) =>
                      jalankan(`status-${b.stoId}`, () =>
                        catatStatusKehadiranManualAction(sesiId, b.stoId, status, menit)
                      )
                    }
                  />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {b.presensiId ? (
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-muted">{b.jarakM ?? 0} m</span>
                      {b.diLuarRadius && (
                        <span className="block text-[10px] font-semibold text-rose-600">
                          di luar radius
                          {b.statusVerifikasi === "menunggu" && " • menunggu"}
                          {b.statusVerifikasi === "diterima" && " • diterima"}
                          {b.statusVerifikasi === "ditolak" && " • ditolak"}
                        </span>
                      )}
                      {b.statusVerifikasi === "menunggu" && !isReadonly && (
                        <div className="flex items-center gap-1">
                          <button
                            disabled={prosesId === `verif-${b.presensiId}`}
                            onClick={() =>
                              jalankan(`verif-${b.presensiId}`, () =>
                                verifikasiPresensiAction(b.presensiId as number, "diterima")
                              )
                            }
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-60"
                          >
                            Terima
                          </button>
                          <button
                            disabled={prosesId === `verif-${b.presensiId}`}
                            onClick={() =>
                              jalankan(`verif-${b.presensiId}`, () =>
                                verifikasiPresensiAction(b.presensiId as number, "ditolak")
                              )
                            }
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-60"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPending && (
        <p className="text-[11px] text-slate-muted inline-flex items-center gap-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Menyimpan perubahan...
        </p>
      )}
    </div>
  );
}

/** Dropdown pilihan status presensi manual (Hadir, Terlambat, Izin, Alpa) */
function BarisStatusManual({
  statusAwal,
  menitAwal,
  isReadonly,
  sedangProses,
  onSimpan,
}: {
  statusAwal: PilihanStatusManual;
  menitAwal: number;
  isReadonly: boolean;
  sedangProses: boolean;
  onSimpan: (status: PilihanStatusManual, menit: number) => void;
}) {
  const [status, setStatus] = useState<PilihanStatusManual>(statusAwal);
  const [menit, setMenit] = useState<number>(menitAwal > 0 ? menitAwal : 16);

  if (isReadonly) {
    return <span className="text-slate-muted">-</span>;
  }

  const adaPerubahan =
    status !== statusAwal || (status === "terlambat" && menit !== menitAwal);

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        disabled={sedangProses}
        onChange={(e) => setStatus(e.target.value as PilihanStatusManual)}
        className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] font-semibold text-navy focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:opacity-60"
      >
        <option value="alpa">Alpa</option>
        <option value="hadir">Hadir</option>
        <option value="terlambat">Terlambat</option>
        <option value="izin">Izin</option>
      </select>

      {status === "terlambat" && (
        <input
          type="number"
          min={1}
          max={1440}
          value={menit}
          disabled={sedangProses}
          onChange={(e) => setMenit(Math.max(1, Number(e.target.value)))}
          className="w-14 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-navy focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:opacity-60"
          title="Menit keterlambatan"
        />
      )}

      <button
        disabled={!adaPerubahan || sedangProses}
        onClick={() => onSimpan(status, menit)}
        className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary text-white text-[10px] font-bold disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
        title="Simpan status presensi"
      >
        {sedangProses ? <Loader2 className="w-3 h-3 animate-spin" /> : "Simpan"}
      </button>
    </div>
  );
}
