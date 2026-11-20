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
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { konfirmasiAksi, konfirmasiHapus } from "@/lib/swal";
import {
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

  async function tutupSekarang() {
    if (!sesiAwal) return;
    const ya = await konfirmasiAksi({
      judul: "Tutup sesi sekarang?",
      pesan: "STO tidak bisa absen lagi setelah sesi ditutup.",
      icon: "warning",
      tombolYa: "Ya, Tutup Sesi",
      warnaKonfirmasi: "#B45309",
    });
    if (!ya) return;
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

  async function hapus() {
    if (!sesiAwal) return;
    const ya = await konfirmasiHapus({
      judul: "Hapus sesi ini?",
      pesan: "Semua data presensi pada sesi ini akan terhapus permanen. Sesi hanya bisa dihapus sebelum agenda selesai.",
      tombolHapus: "Ya, Hapus Sesi",
    });
    if (!ya) return;
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
    <Modal
      onClose={onTutup}
      ariaLabel={sesiAwal ? "Ubah sesi presensi" : "Buat sesi presensi"}
      size="md"
    >
      <form onSubmit={simpan} className="flex min-h-0 flex-1 flex-col">
        <ModalHeader
          title={sesiAwal ? "Ubah Sesi Presensi" : "Buat Sesi Presensi"}
          description={judulAgenda}
          icon={CalendarClock}
          onClose={onTutup}
        />

        <ModalBody>
          {/* Titik presensi hanya informasi: diatur di kartu agenda. */}
          <div className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-surface p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <div className="text-[11px] leading-relaxed">
              <p className="font-semibold text-navy">
                {lokasiNama ?? "Titik lokasi belum diatur"}
              </p>
              <p className="text-slate-muted">
                Radius {radiusM ?? "-"} m • titik presensi mengikuti agenda, bukan sesi
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-navy">
              Tanggal sesi
            </label>
            <input
              type="date"
              required
              value={tanggal}
              min={tglMulai}
              max={tglSelesai ?? tglMulai}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
            />
            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-muted">
              <CalendarClock className="h-3 w-3" />
              Rentang agenda: {tglMulai}
              {tglSelesai && tglSelesai !== tglMulai ? ` s/d ${tglSelesai}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">
                Jam mulai (WIB)
              </label>
              <input
                type="time"
                required
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy">
                Maks. kedatangan
              </label>
              <input
                type="time"
                required
                value={jamMaksDatang}
                onChange={(e) => setJamMaksDatang(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-muted">
            QR hanya tampil antara jam mulai dan jam maksimum kedatangan. Status hadir bila absen ≤ 15 menit dari jam mulai; setelah itu terlambat.
          </p>

          {sesiAwal && (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                onClick={tutupSekarang}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-highlight/15 px-3.5 py-2 text-xs font-semibold text-[#8a6500] transition-colors hover:bg-highlight/25 disabled:opacity-60 cursor-pointer"
              >
                <PowerOff className="h-3.5 w-3.5" /> Tutup sekarang
              </button>
              <button
                type="button"
                onClick={hapus}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus sesi
              </button>
            </div>
          )}

          {pesan && (
            <p
              className={`flex items-center gap-1 text-[11px] ${
                pesan.tipe === "sukses" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {pesan.tipe === "sukses" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {pesan.teks}
            </p>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onTutup}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer transition-all"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {sesiAwal ? "Simpan perubahan" : "Buat sesi"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
