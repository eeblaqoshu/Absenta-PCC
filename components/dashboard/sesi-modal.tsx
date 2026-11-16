// components/dashboard/sesi-modal.tsx
// Modal popup untuk membuat / mengubah sesi presensi sebuah agenda.
// Titik lokasi & jam mulai agenda sudah ditentukan di AGENDA; sesi hanya memilih
// tanggal (di dalam rentang agenda), jam mulai sesi, dan jam maksimum kedatangan.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buatSesiAction,
  ubahSesiAction,
  tutupSesiSekarangAction,
  hapusSesiAction,
} from "@/lib/actions/sesi";
import { keInputLokalWib } from "@/lib/waktu";
import { Modal } from "@/components/ui/modal";
import {
  X,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PowerOff,
  CalendarClock,
  MapPin,
} from "lucide-react";

export interface LokasiOption {
  id: number;
  nama: string;
  lat: number;
  lng: number;
  radiusM: number;
}

export interface SesiItem {
  id: number;
  bukaAt: Date;
  tutupAt: Date;
}

interface Props {
  agendaId: number;
  judulAgenda: string;
  /** Rentang tanggal agenda dalam format YYYY-MM-DD (WIB). */
  tglMulai: string;
  tglSelesai: string | null;
  /** Jam mulai agenda (WIB, "HH:mm") — jadi nilai awal jam mulai sesi. */
  jamAgendaWib: string;
  /** Label titik presensi agenda (sudah diatur di kartu agenda). */
  lokasiNama: string | null;
  radiusM: number | null;
  /** null = mode buat sesi baru. */
  sesiAwal: SesiItem | null;
  onTutup: () => void;
}

function jamDariDate(date: Date): string {
  return keInputLokalWib(new Date(date)).split("T")[1] ?? "00:00";
}

function tanggalDariDate(date: Date): string {
  return keInputLokalWib(new Date(date)).split("T")[0] ?? "";
}

/** Jam "HH:mm" + N menit (dibungkus 24 jam). */
function tambahMenit(jam: string, menit: number): string {
  const [h, m] = jam.split(":").map(Number);
  const total = (h * 60 + m + menit) % (24 * 60);
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function SesiModal({
  agendaId,
  judulAgenda,
  tglMulai,
  tglSelesai,
  jamAgendaWib,
  lokasiNama,
  radiusM,
  sesiAwal,
  onTutup,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);

  const tanggalAwal = sesiAwal ? tanggalDariDate(sesiAwal.bukaAt) : tglMulai;
  const jamMulaiAwal = sesiAwal ? jamDariDate(sesiAwal.bukaAt) : jamAgendaWib;
  const jamMaksAwal = sesiAwal ? jamDariDate(sesiAwal.tutupAt) : tambahMenit(jamAgendaWib, 60);

  const [tanggal, setTanggal] = useState(tanggalAwal);
  const [jamMulai, setJamMulai] = useState(jamMulaiAwal);
  const [jamMaksDatang, setJamMaksDatang] = useState(jamMaksAwal);

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
    formData.append("agendaId", String(agendaId));
    formData.append("tanggal", tanggal);
    formData.append("jamMulai", jamMulai);
    formData.append("jamMaksDatang", jamMaksDatang);

    startTransition(async () => {
      const hasil = sesiAwal
        ? await ubahSesiAction(sesiAwal.id, formData)
        : await buatSesiAction(null, formData);

      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      router.refresh();
      onTutup();
    });
  }

  function tutupSekarang() {
    if (!sesiAwal) return;
    if (!confirm("Tutup sesi ini sekarang? STO tidak bisa absen lagi setelah ditutup.")) return;
    startTransition(async () => {
      const hasil = await tutupSesiSekarangAction(sesiAwal.id);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      router.refresh();
      onTutup();
    });
  }

  function hapus() {
    if (!sesiAwal) return;
    if (!confirm("Hapus sesi ini? Tindakan ini tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const hasil = await hapusSesiAction(sesiAwal.id);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      router.refresh();
      onTutup();
    });
  }

  return (
    <Modal onClose={onTutup} ariaLabel={sesiAwal ? "Ubah sesi presensi" : "Buat sesi presensi"}>
      <form
        onSubmit={simpan}
        className="mx-auto flex max-h-full min-h-0 w-full max-w-md flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {sesiAwal ? "Ubah Sesi Presensi" : "Buat Sesi Presensi"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{judulAgenda}</p>
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-none p-5">
          {/* Titik presensi hanya informasi: diatur di kartu agenda. */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                {lokasiNama ?? "Titik lokasi belum diatur"}
              </p>
              <p className="text-zinc-500">
                Radius {radiusM ?? "-"} m • titik presensi mengikuti agenda, bukan sesi
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Tanggal sesi
            </label>
            <input
              type="date"
              required
              value={tanggal}
              min={tglMulai}
              max={tglSelesai ?? tglMulai}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Rentang agenda: {tglMulai}
              {tglSelesai && tglSelesai !== tglMulai ? ` s/d ${tglSelesai}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Jam mulai (WIB)
              </label>
              <input
                type="time"
                required
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Maks. kedatangan
              </label>
              <input
                type="time"
                required
                value={jamMaksDatang}
                onChange={(e) => setJamMaksDatang(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500">
            QR hanya tampil antara jam mulai dan jam maksimum kedatangan. Status hadir bila absen ≤
            15 menit dari jam mulai; setelah itu terlambat.
          </p>

          {sesiAwal && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={tutupSekarang}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[11px] font-semibold disabled:opacity-60 transition-colors"
              >
                <PowerOff className="w-3.5 h-3.5" /> Tutup sekarang
              </button>
              <button
                type="button"
                onClick={hapus}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-[11px] font-semibold disabled:opacity-60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus sesi
              </button>
            </div>
          )}

          {pesan && (
            <p
              className={`text-[11px] flex items-center gap-1 ${
                pesan.tipe === "sukses" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {pesan.tipe === "sukses" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {pesan.teks}
            </p>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onTutup}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {sesiAwal ? "Simpan perubahan" : "Buat sesi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
