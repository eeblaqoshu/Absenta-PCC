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
  hadir: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  terlambat: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  izin_disetujui: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  izin_menunggu: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
  alpa: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  ditolak: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
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
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Kelola Kehadiran Peserta
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {rekap.namaProker} • {rekap.judulAgenda}
            {rekap.sesiSudahDitutup ? " • sesi sudah ditutup (poin final)" : " • sesi belum ditutup"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat ulang
          </button>
          <a
            href={`/api/presensi/export?sesiId=${sesiId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </a>
        </div>
      </div>

      {pesan && (
        <p
          className={`text-[11px] ${
            pesan.tipe === "sukses" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="overflow-x-auto scrollbar-none" data-lenis-prevent>
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-3">Peserta</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Telat (menit)</th>
              <th className="px-3 py-3">Radius</th>
              <th className="px-3 py-3">Izin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rekap.baris.map((b) => (
              <tr key={b.stoId} className="align-middle">
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{b.nama}</div>
                  <div className="text-[10px] text-zinc-500">
                    {b.nim} • {b.divisi ?? "Umum"}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${GAYA[b.statusKehadiran]}`}>
                    {LABEL[b.statusKehadiran]}
                  </span>
                  {b.manual && <span className="ml-1 text-[10px] text-zinc-400">manual</span>}
                  {rekap.sesiSudahDitutup && (
                    <span className="ml-1 text-[10px] text-zinc-400">({b.poin > 0 ? "+" : ""}{b.poin} poin)</span>
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
                    <span className="text-zinc-400">-</span>
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
                      <span className="text-[11px] text-zinc-500">{b.jarakM ?? 0} m</span>
                      {b.diLuarRadius && (
                        <span className="block text-[10px] font-semibold text-rose-600 dark:text-rose-400">
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
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold disabled:opacity-60"
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
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold disabled:opacity-60"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {b.izin ? (
                    <div className="space-y-1">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-300 capitalize">
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold disabled:opacity-60"
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
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold disabled:opacity-60"
                          >
                            <X className="w-3 h-3" />
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPending && (
        <p className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
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
    return <span className="text-[11px] text-zinc-500">{awal} mnt</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={1440}
        value={nilai}
        onChange={(e) => setNilai(Number(e.target.value))}
        className="w-16 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px]"
      />
      <button
        disabled={!berubah || sedangProses}
        onClick={() => onSimpan(nilai)}
        className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold disabled:opacity-40"
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
        className="w-16 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px]"
        title="Menit keterlambatan"
      />
      <button
        disabled={sedangProses}
        onClick={() => onCatat(menit)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold disabled:opacity-60"
        title="Catat kehadiran manual"
      >
        {sedangProses ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
        Catat
      </button>
    </div>
  );
}
