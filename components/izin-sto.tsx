// components/izin-sto.tsx
// Pengajuan izin STO per SESI presensi (satu izin per sesi), ditinjau adsek.
"use client";

import { useState, useTransition } from "react";
import { ajukanIzinAction, batalIzinAction } from "@/lib/actions/izin";
import { JenisIzin, StatusIzin } from "@prisma/client";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  QrCode,
} from "lucide-react";

export interface SesiIzin {
  sesiId: number;
  judul: string;
  namaProker: string;
  /** Hari pelaksanaan sesi (ISO, tengah malam lokal). */
  tanggal: string;
  /** "07:00–08:00 WIB" */
  jamLabel: string;
  izin: { id: number; jenis: JenisIzin; status: StatusIzin; alasan: string } | null;
}

const LABEL_STATUS: Record<StatusIzin, string> = {
  menunggu: "Menunggu peninjauan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

const LABEL_JENIS: Record<JenisIzin, string> = {
  terlambat: "Terlambat",
  sakit: "Sakit",
  izin: "Izin / Halangan",
  lainnya: "Lainnya",
};

const GAYA_JENIS: Record<JenisIzin, string> = {
  terlambat: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  sakit: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  izin: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  lainnya: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const GAYA_STATUS: Record<StatusIzin, string> = {
  menunggu: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  disetujui: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  ditolak: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export function IzinSto({ daftar }: { daftar: SesiIzin[] }) {
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);
  const [terbuka, setTerbuka] = useState<number | null>(null);
  const [jenis, setJenis] = useState<JenisIzin>(JenisIzin.izin);
  const [alasan, setAlasan] = useState("");

  function kirim(sesiId: number) {
    setPesan(null);
    const formData = new FormData();
    formData.append("sesiId", String(sesiId));
    formData.append("jenis", jenis);
    formData.append("alasan", alasan);

    startTransition(async () => {
      const hasil = await ajukanIzinAction(null, formData);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Izin terkirim" });
      setTerbuka(null);
      setAlasan("");
      setJenis(JenisIzin.izin);
    });
  }

  function batalkan(izinId: number) {
    if (!confirm("Batalkan pengajuan izin ini?")) return;
    setPesan(null);
    startTransition(async () => {
      const hasil = await batalIzinAction(izinId);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Izin dibatalkan" });
    });
  }

  if (daftar.length === 0) {
    return (
      <div className="p-10 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Belum ada sesi presensi yang bisa diajukan izin
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Izin diajukan per sesi. Sesi akan tampil di sini setelah adsek membuat sesi presensi pada
          agenda Anda dan sesinya belum ditutup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {daftar.map((item) => {
        const status = item.izin?.status ?? null;
        const sedangBuka = terbuka === item.sesiId;

        return (
          <div
            key={item.sesiId}
            className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.judul}</h3>
                <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  {item.namaProker} •{" "}
                  {new Date(item.tanggal).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 inline-flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-zinc-400" />
                  Sesi {item.jamLabel}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.izin && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${GAYA_JENIS[item.izin.jenis]}`}>
                    {LABEL_JENIS[item.izin.jenis]}
                  </span>
                )}
                {status ? (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${GAYA_STATUS[status]}`}>
                    {LABEL_STATUS[status]}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Belum ada izin
                  </span>
                )}
              </div>
            </div>

            {item.izin && (
              <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-3">
                {item.izin.alasan}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {status !== StatusIzin.disetujui && (
                <button
                  onClick={() => {
                    setTerbuka(sedangBuka ? null : item.sesiId);
                    setAlasan(item.izin?.alasan ?? "");
                    setJenis(item.izin?.jenis ?? JenisIzin.izin);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-[11px] font-semibold transition-colors"
                >
                  {sedangBuka ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {item.izin ? "Ubah pengajuan izin" : "Ajukan izin"}
                </button>
              )}

              {item.izin && status !== StatusIzin.disetujui && (
                <button
                  onClick={() => batalkan(item.izin!.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Batalkan
                </button>
              )}

              {status === StatusIzin.disetujui && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Poin sesi ini: 0 (izin disetujui)
                </span>
              )}
            </div>

            {sedangBuka && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Jenis izin
                  </label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value as JenisIzin)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={JenisIzin.terlambat}>Terlambat (akan datang terlambat)</option>
                    <option value={JenisIzin.sakit}>Sakit</option>
                    <option value={JenisIzin.izin}>Izin / Halangan</option>
                    <option value={JenisIzin.lainnya}>Lainnya</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: sakit demam, ada kelas praktikum wajib, akan datang terlambat 20 menit karena lomba mewakili kampus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => kirim(item.sesiId)}
                    disabled={isPending || alasan.trim().length < 5}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Kirim pengajuan
                  </button>
                  <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Menunggu peninjauan adsek
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
