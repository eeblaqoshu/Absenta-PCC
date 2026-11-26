// components/dashboard/daftar-kehadiran.tsx
// Tabel kelola kehadiran satu sesi (adsek): status per peserta, lampiran TTD otomatis,
// koreksi status/izin manual via dropdown, verifikasi radius, dan ekspor CSV.
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  catatStatusKehadiranManualAction,
  verifikasiPresensiAction,
  type PilihanStatusManual,
} from "@/lib/actions/presensi";
import { adalahAgendaBerpoin } from "@/lib/poin";
import { formatLabelDivisi } from "@/lib/divisi";
import { FileDown, Loader2, RefreshCw } from "lucide-react";
import type { RekapKehadiranSesi, StatusKehadiran } from "@/lib/kehadiran";

const LABEL: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin",
  izin_menunggu: "Izin (Menunggu)",
  alpa: "Alpa",
  ditolak: "Ditolak",
};

const GAYA: Record<StatusKehadiran, string> = {
  hadir: "bg-secondary/10 text-secondary border border-secondary/20",
  terlambat: "bg-highlight/20 text-primary border border-highlight/40",
  izin_disetujui: "bg-accent/15 text-primary border border-accent/30",
  izin_menunggu: "bg-surface text-slate-muted border border-[#E2E8F0]",
  alpa: "bg-primary/10 text-primary border border-primary/20",
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
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);
  const [prosesId, setProsesId] = useState<string | null>(null);

  const berpoin = adalahAgendaBerpoin(rekap.jenisAgenda);

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

  function jalankan(
    kunci: string,
    aksi: () => Promise<{ error?: { pesan: string }; pesan?: string }>,
  ) {
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
            {rekap.sesiSudahDitutup
              ? berpoin
                ? " • sesi ditutup (poin Hari H final)"
                : " • sesi ditutup (rapat 0 poin)"
              : " • sesi sedang berjalan"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isReadonly && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent/15 border border-accent/40 text-[10px] font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Real-time aktif
            </span>
          )}
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-[11px] font-semibold text-navy hover:bg-surface cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat ulang
          </button>
          <Link
            href={`/dashboard/presensi/${sesiId}/pdf`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary text-white text-[11px] font-semibold shadow-md shadow-secondary/25 cursor-pointer transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export PDF
          </Link>
        </div>
      </div>

      {pesan && (
        <p
          className={`text-[11px] font-medium ${
            pesan.tipe === "sukses" ? "text-secondary" : "text-primary"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div
        className="overflow-x-auto scrollbar-none"
        data-lenis-prevent-horizontal
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-3 py-3">Peserta</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">TTD Otomatis</th>
              <th className="px-3 py-3">Atur Status (Manual)</th>
              <th className="px-3 py-3">Radius</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rekap.baris.map((b) => {
              const sudahHadirSah =
                b.statusKehadiran === "hadir" ||
                b.statusKehadiran === "terlambat";

              return (
                <tr key={b.stoId} className="align-middle">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="font-semibold text-navy">{b.nama}</div>
                    <div
                      className="text-[10px] text-slate-muted"
                      title={b.divisi ?? "Umum"}
                    >
                      {b.nim} • {formatLabelDivisi(b.divisi)}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${GAYA[b.statusKehadiran]}`}
                    >
                      {LABEL[b.statusKehadiran]}
                    </span>
                    {b.statusKehadiran === "terlambat" &&
                      b.menitTerlambat > 0 && (
                        <span className="ml-1 text-[10px] text-primary font-semibold">
                          ({b.menitTerlambat}m)
                        </span>
                      )}
                    {b.manual && (
                      <span className="ml-1 text-[10px] text-slate-muted">
                        manual
                      </span>
                    )}
                    {rekap.sesiSudahDitutup && berpoin && (
                      <span className="ml-1 text-[10px] text-slate-muted">
                        ({b.poin > 0 ? "+" : ""}
                        {b.poin} poin)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {sudahHadirSah ? (
                      b.ttd ? (
                        <div
                          role="img"
                          aria-label={`TTD ${b.nama}`}
                          className="w-28 h-11 p-1.5 rounded-xl bg-surface border border-[#E2E8F0] overflow-hidden"
                        >
                          <div
                            className="w-full h-full bg-contain bg-center bg-no-repeat"
                            style={{ backgroundImage: `url("${b.ttd}")` }}
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-muted italic">
                          TTD belum diunggah Admin
                        </span>
                      )
                    ) : (
                      <span className="text-slate-muted">-</span>
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
                          catatStatusKehadiranManualAction(
                            sesiId,
                            b.stoId,
                            status,
                            menit,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {b.presensiId ? (
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-muted">
                          {b.jarakM ?? 0} m
                        </span>
                        {b.diLuarRadius && (
                          <span className="block text-[10px] font-semibold text-primary">
                            di luar radius
                            {b.statusVerifikasi === "menunggu" && " • menunggu"}
                            {b.statusVerifikasi === "diterima" && " • diterima"}
                            {b.statusVerifikasi === "ditolak" && " • ditolak"}
                          </span>
                        )}
                        {b.statusVerifikasi === "menunggu" && !isReadonly && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              suppressHydrationWarning
                              disabled={prosesId === `verif-${b.presensiId}`}
                              onClick={() =>
                                jalankan(`verif-${b.presensiId}`, () =>
                                  verifikasiPresensiAction(
                                    b.presensiId as number,
                                    "diterima",
                                  ),
                                )
                              }
                              className="px-2 py-0.5 rounded bg-secondary hover:bg-primary text-white text-[10px] font-bold cursor-pointer disabled:opacity-60"
                            >
                              Terima
                            </button>
                            <button
                              type="button"
                              suppressHydrationWarning
                              disabled={prosesId === `verif-${b.presensiId}`}
                              onClick={() =>
                                jalankan(`verif-${b.presensiId}`, () =>
                                  verifikasiPresensiAction(
                                    b.presensiId as number,
                                    "ditolak",
                                  ),
                                )
                              }
                              className="px-2 py-0.5 rounded bg-highlight hover:opacity-90 text-navy text-[10px] font-bold cursor-pointer disabled:opacity-60"
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
              );
            })}
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
        suppressHydrationWarning
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
          suppressHydrationWarning
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
        type="button"
        suppressHydrationWarning
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
