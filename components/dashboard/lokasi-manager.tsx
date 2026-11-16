// components/dashboard/lokasi-manager.tsx
// Kelola master lokasi presensi (titik pusat + radius) yang bisa dipakai ulang saat membuat sesi.
"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import {
  tambahLokasiAction,
  ubahLokasiAction,
  hapusLokasiAction,
} from "@/lib/actions/lokasi";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Crosshair,
} from "lucide-react";

export interface LokasiItem {
  id: number;
  nama: string;
  lat: number;
  lng: number;
  radiusM: number;
}

interface Props {
  initialLokasi: LokasiItem[];
}

const RADIUS_DEFAULT = 500;
const LAT_DEFAULT = -6.9999;
const LNG_DEFAULT = 110.42;

export function LokasiManager({ initialLokasi }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);

  const [modalBuka, setModalBuka] = useState(false);
  const [diedit, setDiedit] = useState<LokasiItem | null>(null);

  const [nama, setNama] = useState("");
  const [lat, setLat] = useState(LAT_DEFAULT);
  const [lng, setLng] = useState(LNG_DEFAULT);
  const [radiusM, setRadiusM] = useState(RADIUS_DEFAULT);

  function resetForm() {
    setDiedit(null);
    setNama("");
    setLat(LAT_DEFAULT);
    setLng(LNG_DEFAULT);
    setRadiusM(RADIUS_DEFAULT);
  }

  function bukaTambah() {
    resetForm();
    setPesan(null);
    setModalBuka(true);
  }

  function bukaEdit(item: LokasiItem) {
    setDiedit(item);
    setNama(item.nama);
    setLat(item.lat);
    setLng(item.lng);
    setRadiusM(item.radiusM);
    setPesan(null);
    setModalBuka(true);
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
    formData.append("nama", nama);
    formData.append("lat", String(lat));
    formData.append("lng", String(lng));
    formData.append("radiusM", String(radiusM));

    startTransition(async () => {
      const hasil = diedit
        ? await ubahLokasiAction(diedit.id, formData)
        : await tambahLokasiAction(null, formData);

      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }

      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Berhasil" });
      setModalBuka(false);
      resetForm();
    });
  }

  function hapus(item: LokasiItem) {
    if (!confirm(`Hapus lokasi "${item.nama}"?`)) return;
    setPesan(null);
    startTransition(async () => {
      const hasil = await hapusLokasiAction(item.id);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Lokasi dihapus" });
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Master Lokasi Presensi</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftarkan titik pusat dan radius. Lokasi ini bisa langsung dipilih saat membuat sesi presensi.
          </p>
        </div>
        <button
          onClick={bukaTambah}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Daftarkan Lokasi
        </button>
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

      {initialLokasi.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <MapPin className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Belum ada lokasi terdaftar
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Tambahkan minimal satu titik agar pembuatan sesi presensi lebih cepat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialLokasi.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.nama}</h3>
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-blue-500" />
                    {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    radius {item.radiusM} m
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bukaEdit(item)}
                    title="Ubah"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => hapus(item)}
                    disabled={isPending}
                    title="Hapus"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalBuka && (
        <Modal onClose={() => { setModalBuka(false); resetForm(); }} ariaLabel={diedit ? "Edit lokasi" : "Tambah lokasi"}>
          <div className="mx-auto flex max-h-full min-h-0 w-full max-w-2xl flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="shrink-0 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {diedit ? `Ubah Lokasi: ${diedit.nama}` : "Daftarkan Lokasi Baru"}
              </h3>
              <button
                onClick={() => {
                  setModalBuka(false);
                  resetForm();
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={simpan} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-none p-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Lokasi
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  placeholder="Contoh: Auditorium Polines"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Radius (meter)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    required
                    value={radiusM}
                    onChange={(e) => setRadiusM(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <PetaPilihLokasi
                lat={lat}
                lng={lng}
                radiusM={radiusM}
                onPilih={(la, lo) => {
                  setLat(la);
                  setLng(lo);
                }}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalBuka(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {diedit ? "Simpan Perubahan" : "Daftarkan"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
