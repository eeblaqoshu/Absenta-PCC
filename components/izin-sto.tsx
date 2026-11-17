// components/izin-sto.tsx
// Pengajuan izin STO per SESI presensi (satu izin per sesi), ditinjau adsek.
"use client";

import { useState, useTransition } from "react";
import { ajukanIzinAction, batalIzinAction } from "@/lib/actions/izin";
import { konfirmasiAksi } from "@/lib/swal";
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
  terlambat: "bg-amber-50 text-amber-700",
  sakit: "bg-rose-50 text-rose-700",
  izin: "bg-secondary/10 text-secondary",
  lainnya: "bg-surface text-slate-muted",
};

const GAYA_STATUS: Record<StatusIzin, string> = {
  menunggu: "bg-highlight/15 text-[#8a6500]",
  disetujui: "bg-emerald-100 text-emerald-700",
  ditolak: "bg-rose-100 text-rose-700",
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

  async function batalkan(izinId: number) {
    const ya = await konfirmasiAksi({
      judul: "Batalkan pengajuan izin?",
      pesan: "Pengajuan izin ini akan dihapus dan tidak ditinjau adsek.",
      icon: "warning",
      tombolYa: "Ya, Batalkan",
      warnaKonfirmasi: "#E11D48",
    });
    if (!ya) return;

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
      <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-slate-muted" />
        <p className="text-sm font-semibold text-navy">
          Belum ada sesi presensi yang bisa diajukan izin
        </p>
        <p className="mt-1 text-xs text-slate-muted">
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

      {daftar.map((item) => {
        const status = item.izin?.status ?? null;
        const sedangBuka = terbuka === item.sesiId;

        return (
          <div
            key={item.sesiId}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-primary">{item.judul}</h3>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-muted">
                  <Calendar className="h-3.5 w-3.5 text-secondary" />
                  {item.namaProker} •{" "}
                  {new Date(item.tanggal).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-muted">
                  <QrCode className="h-3.5 w-3.5 text-slate-muted" />
                  Sesi {item.jamLabel}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.izin && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${GAYA_JENIS[item.izin.jenis]}`}
                  >
                    {LABEL_JENIS[item.izin.jenis]}
                  </span>
                )}
                {status ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${GAYA_STATUS[status]}`}
                  >
                    {LABEL_STATUS[status]}
                  </span>
                ) : (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold text-slate-muted">
                    Belum ada izin
                  </span>
                )}
              </div>
            </div>

            {item.izin && (
              <p className="mt-3 rounded-xl bg-surface p-3 text-xs text-navy">{item.izin.alasan}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {status !== StatusIzin.disetujui && (
                <button
                  onClick={() => {
                    setTerbuka(sedangBuka ? null : item.sesiId);
                    setAlasan(item.izin?.alasan ?? "");
                    setJenis(item.izin?.jenis ?? JenisIzin.izin);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/10 px-3.5 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/20 cursor-pointer"
                >
                  {sedangBuka ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {item.izin ? "Ubah pengajuan izin" : "Ajukan izin"}
                </button>
              )}

              {item.izin && status !== StatusIzin.disetujui && (
                <button
                  onClick={() => batalkan(item.izin!.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Batalkan
                </button>
              )}

              {status === StatusIzin.disetujui && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Poin sesi ini: 0 (izin disetujui)
                </span>
              )}
            </div>

            {sedangBuka && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">
                    Jenis izin
                  </label>
                  <select
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value as JenisIzin)}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
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
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => kirim(item.sesiId)}
                    disabled={isPending || alasan.trim().length < 5}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary hover:bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-secondary/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Kirim pengajuan
                  </button>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-muted">
                    <Clock className="h-3 w-3" />
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
