// components/dashboard/izin-manager.tsx
// Peninjauan izin STO oleh adsek: setujui / tolak.
"use client";

import { useMemo, useState, useTransition } from "react";
import { tinjauIzinAction } from "@/lib/actions/izin";
import { konfirmasiAksi } from "@/lib/swal";
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
  agenda: { judul: string; namaProker: string; jadwal: string };
}

const GAYA_STATUS: Record<StatusIzin, string> = {
  menunggu: "bg-highlight/15 text-[#8a6500]",
  disetujui: "bg-emerald-100 text-emerald-700",
  ditolak: "bg-rose-100 text-rose-700",
};

const GAYA_JENIS: Record<JenisIzin, string> = {
  terlambat: "bg-amber-100 text-amber-700",
  sakit: "bg-secondary/10 text-secondary",
  izin: "bg-accent/15 text-[#0b7f9a]",
  lainnya: "bg-surface text-slate-muted",
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

  async function tinjau(izinId: number, keputusan: "disetujui" | "ditolak") {
    const setuju = await konfirmasiAksi({
      judul: keputusan === "disetujui" ? "Setujui izin ini?" : "Tolak izin ini?",
      pesan:
        keputusan === "disetujui"
          ? "Izin berlaku untuk seluruh sesi pada agenda tersebut dan poinnya menjadi 0."
          : "STO akan dihitung alpa bila tidak hadir.",
      icon: keputusan === "disetujui" ? "question" : "warning",
      tombolYa: keputusan === "disetujui" ? "Ya, Setujui" : "Ya, Tolak",
      warnaKonfirmasi: keputusan === "disetujui" ? "#059669" : "#E11D48",
    });
    if (!setuju) return;

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

  const tab: Array<{ nilai: StatusIzin | "semua"; label: string; jumlah: number }> = [
    { nilai: "menunggu", label: "Menunggu", jumlah: jumlah.menunggu },
    { nilai: "disetujui", label: "Disetujui", jumlah: jumlah.disetujui },
    { nilai: "ditolak", label: "Ditolak", jumlah: jumlah.ditolak },
    { nilai: "semua", label: "Semua", jumlah: jumlah.semua },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h1 className="inline-flex items-center gap-2 text-xl font-bold text-primary tracking-tight">
          Peninjauan Izin
        </h1>
        <p className="mt-1 text-xs text-slate-muted">
          Setujui pengajuan STO untuk agenda; statusnya akan tercermin di semua sesi agenda tersebut.
        </p>
      </div>

      <div
        className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-[#E2E8F0] bg-surface p-1.5 shadow-sm scrollbar-none"
        data-lenis-prevent-horizontal
      >
        {tab.map((t) => (
          <button
            key={t.nilai}
            onClick={() => setFilter(t.nilai)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
              filter === t.nilai
                ? "border border-[#CBD5E1] bg-white text-primary shadow-sm"
                : "text-slate-muted hover:text-navy"
            }`}
          >
            {t.label}
            <span
              className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                filter === t.nilai ? "bg-primary text-white" : "bg-[#E2E8F0] text-slate-muted"
              }`}
            >
              {t.jumlah}
            </span>
          </button>
        ))}
      </div>

      {pesan && (
        <div
          className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{pesan.teks}</span>
        </div>
      )}

      {terlihat.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-muted" />
          <p className="text-sm font-semibold text-navy">Tidak ada izin pada filter ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {terlihat.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all hover:border-secondary hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-primary">
                    {item.sto.nama}
                    <span className="ml-2 text-xs font-normal text-slate-muted">
                      {item.sto.nim} • {item.sto.divisi ?? "Umum"}
                    </span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-muted">
                    {item.agenda.judul} — {item.agenda.namaProker} • {item.agenda.jadwal}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${GAYA_JENIS[item.jenis]}`}
                  >
                    {LABEL_JENIS[item.jenis]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${GAYA_STATUS[item.status]}`}
                  >
                    {LABEL_STATUS[item.status]}
                  </span>
                </div>
              </div>

              <p className="mt-3 rounded-xl bg-surface p-3 text-xs text-navy">{item.alasan}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-slate-muted">
                  Diajukan{" "}
                  {new Date(item.createdAt).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer disabled:opacity-60"
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 transition-all cursor-pointer disabled:opacity-60"
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
