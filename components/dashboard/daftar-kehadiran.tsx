// components/dashboard/daftar-kehadiran.tsx
// Tabel kelola kehadiran satu sesi (adsek): status per peserta, koreksi menit
// keterlambatan, absensi manual, verifikasi radius, tinjau izin, dan ekspor CSV.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  catatPresensiManualAction,
  aturMenitTerlambatAction,
  verifikasiPresensiAction,
} from "@/lib/actions/presensi";
import { tinjauIzinAction } from "@/lib/actions/izin";
import { Download, Loader2, UserPlus, Check, X, RefreshCw } from "lucide-react";
import type { RekapKehadiranSesi, StatusKehadiran } from "@/lib/kehadiran";

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
  sesiId: number;
  isReadonly: boolean;
  rekap: RekapKehadiranSesi;
}

export function DaftarKehadiran({ sesiId, isReadonly, rekap }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);
  const [prosesId, setProsesId] = useState<string | null>(null);

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

      <div className="overflow-x-auto scrollbar-none" data-lenis-prevent>
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-3 py-3">Peserta</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Telat (menit)</th>
              <th className="px-3 py-3">Radius</th>
              <th className="px-3 py-3">Izin</th>
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
                  {b.manual && <span className="ml-1 text-[10px] text-slate-muted">manual</span>}
                  {rekap.sesiSudahDitutup && (
                    <span className="ml-1 text-[10px] text-slate-muted">({b.poin > 0 ? "+" : ""}{b.poin} poin)</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {b.presensiId ? (
                    <BarisMenit
                      presensiId={b.presensiId}
                      awal={b.menitTerlambat}
                      isReadonly={isReadonly}
                      sedangProses={prosesId === `menit-${b.presensiId}`}
                      onSimpan={(menit) =>
                        jalankan(`menit-${b.presensiId}`, () =>
                          aturMenitTerlambatAction(b.presensiId as number, menit)
                        )
                      }
                    />
                  ) : isReadonly ? (
                    <span className="text-slate-muted">-</span>
                  ) : (
                    <BarisCatatManual
                      sedangProses={prosesId === `catat-${b.stoId}`}
                      onCatat={(menit) =>
                        jalankan(`catat-${b.stoId}`, () =>
                          catatPresensiManualAction(sesiId, b.stoId, menit)
                        )
                      }
                    />
                  )}
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
                <td className="px-3 py-3 whitespace-nowrap">
                  {b.izin ? (
                    <div className="space-y-1">
                      <span className="text-[11px] text-navy capitalize">
                        {b.izin.jenis} • {b.izin.status}
                      </span>
                      {b.izin.status === "menunggu" && !isReadonly && (
                        <div className="flex items-center gap-1">
                          <button
                            disabled={prosesId === `izin-${b.izin!.id}`}
                            onClick={() =>
                              jalankan(`izin-${b.izin!.id}`, () =>
                                tinjauIzinAction(b.izin!.id, "disetujui")
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-60"
                          >
                            <Check className="w-3 h-3" />
                            Setujui
                          </button>
                          <button
                            disabled={prosesId === `izin-${b.izin!.id}`}
                            onClick={() =>
                              jalankan(`izin-${b.izin!.id}`, () =>
                                tinjauIzinAction(b.izin!.id, "ditolak")
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-60"
                          >
                            <X className="w-3 h-3" />
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

/** Input menit keterlambatan untuk presensi yang sudah ada. */
function BarisMenit({
  presensiId,
  awal,
  isReadonly,
  sedangProses,
  onSimpan,
}: {
  presensiId: number;
  awal: number;
  isReadonly: boolean;
  sedangProses: boolean;
  onSimpan: (menit: number) => void;
}) {
  const [nilai, setNilai] = useState<number>(awal);
  const berubah = nilai !== awal;

  if (isReadonly) {
    return <span className="text-[11px] text-slate-muted">{awal} mnt</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={1440}
        value={nilai}
        onChange={(e) => setNilai(Number(e.target.value))}
        className="w-16 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-navy focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
      />
      <button
        disabled={!berubah || sedangProses}
        onClick={() => onSimpan(nilai)}
        className="px-2 py-1 rounded-lg bg-secondary hover:bg-primary text-white text-[10px] font-bold disabled:opacity-40"
        title={`Simpan keterlambatan presensi #${presensiId}`}
      >
        {sedangProses ? <Loader2 className="w-3 h-3 animate-spin" /> : "Simpan"}
      </button>
    </div>
  );
}

/** Form kecil untuk absensi manual peserta yang belum punya presensi. */
function BarisCatatManual({
  sedangProses,
  onCatat,
}: {
  sedangProses: boolean;
  onCatat: (menit: number) => void;
}) {
  const [menit, setMenit] = useState<number>(0);

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={1440}
        value={menit}
        onChange={(e) => setMenit(Number(e.target.value))}
        className="w-16 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-navy focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
        title="Menit keterlambatan"
      />
      <button
        disabled={sedangProses}
        onClick={() => onCatat(menit)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary hover:bg-secondary text-white text-[10px] font-bold disabled:opacity-60"
        title="Catat kehadiran manual"
      >
        {sedangProses ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
        Catat
      </button>
    </div>
  );
}
