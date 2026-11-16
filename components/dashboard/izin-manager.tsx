// components/dashboard/izin-manager.tsx
// Peninjauan izin STO oleh adsek: setujui / tolak.
"use client";

import { useMemo, useState, useTransition } from "react";
import { tinjauIzinAction } from "@/lib/actions/izin";
import { JenisIzin, StatusIzin } from "@prisma/client";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  FileText,
  Filter,
} from "lucide-react";

export interface BarisIzin {
  id: number;
  jenis: JenisIzin;
  status: StatusIzin;
  alasan: string;
  createdAt: string; // ISO
  ditinjauAt: string | null;
  namaPeninjau: string | null;
  sto: { nama: string; nim: string; divisi: string | null };
  sesi: { judul: string; namaProker: string; jadwal: string };
}

const GAYA_STATUS: Record<StatusIzin, string> = {
  menunggu: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  disetujui: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  ditolak: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

const LABEL_STATUS: Record<StatusIzin, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

const LABEL_JENIS: Record<JenisIzin, string> = {
  terlambat: "Terlambat",
  sakit: "Sakit",
  izin: "Izin / Halangan",
  lainnya: "Lainnya",
};

export function IzinManager({ daftar }: { daftar: BarisIzin[] }) {
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);
  const [filter, setFilter] = useState<StatusIzin | "semua">("menunggu");

  const terlihat = useMemo(
    () => (filter === "semua" ? daftar : daftar.filter((d) => d.status === filter)),
    [daftar, filter]
  );

  const jumlah = useMemo(
    () => ({
      semua: daftar.length,
      menunggu: daftar.filter((d) => d.status === "menunggu").length,
      disetujui: daftar.filter((d) => d.status === "disetujui").length,
      ditolak: daftar.filter((d) => d.status === "ditolak").length,
    }),
    [daftar]
  );

  function tinjau(izinId: number, keputusan: "disetujui" | "ditolak") {
    const konfirmasi =
      keputusan === "disetujui"
        ? "Setujui izin ini? Poin STO untuk sesi tersebut menjadi 0."
        : "Tolak izin ini? STO akan dihitung alpa bila tidak hadir.";
    if (!confirm(konfirmasi)) return;

    setPesan(null);
    startTransition(async () => {
      const hasil = await tinjauIzinAction(izinId, keputusan);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Izin ditinjau" });
    });
  }

  const tab: Array<{ nilai: StatusIzin | "semua"; label: string }> = [
    { nilai: "menunggu", label: `Menunggu (${jumlah.menunggu})` },
    { nilai: "disetujui", label: `Disetujui (${jumlah.disetujui})` },
    { nilai: "ditolak", label: `Ditolak (${jumlah.ditolak})` },
    { nilai: "semua", label: `Semua (${jumlah.semua})` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Peninjauan Izin</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Setujui izin STO per sesi presensi. Izin disetujui = poin sesi itu 0.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none" data-lenis-prevent>
        <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        {tab.map((t) => (
          <button
            key={t.nilai}
            onClick={() => setFilter(t.nilai)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
              filter === t.nilai
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pesan && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{pesan.teks}</span>
        </div>
      )}

      {terlihat.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Tidak ada izin pada filter ini
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {terlihat.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {item.sto.nama}
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {item.sto.nim} • {item.sto.divisi ?? "Umum"}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {item.sesi.judul} — {item.sesi.namaProker} • {item.sesi.jadwal}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {LABEL_JENIS[item.jenis]}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${GAYA_STATUS[item.status]}`}
                  >
                    {LABEL_STATUS[item.status]}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-3">
                {item.alasan}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-500">
                  Diajukan{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {item.ditinjauAt && item.namaPeninjau && (
                    <>
                      {" • ditinjau oleh "}
                      {item.namaPeninjau}
                    </>
                  )}
                </p>

                {item.status === "menunggu" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => tinjau(item.id, "disetujui")}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors"
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Setujui
                    </button>
                    <button
                      onClick={() => tinjau(item.id, "ditolak")}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 disabled:opacity-60 text-[11px] font-semibold transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
