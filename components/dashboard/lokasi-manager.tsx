// components/dashboard/lokasi-manager.tsx
// Kelola master lokasi presensi (titik pusat + radius) yang bisa dipakai ulang saat membuat sesi.
"use client";

import { useState, useTransition } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import {
  tambahLokasiAction,
  ubahLokasiAction,
  hapusLokasiAction,
} from "@/lib/actions/lokasi";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import { konfirmasiHapus } from "@/lib/swal";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
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

  async function hapus(item: LokasiItem) {
    const ya = await konfirmasiHapus({
      judul: "Hapus lokasi?",
      pesan: `Lokasi "${item.nama}" akan dihapus. Titik pada agenda yang sudah dibuat tidak berubah.`,
    });
    if (!ya) return;
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
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">Master Lokasi Presensi</h1>
          <p className="text-xs text-slate-muted mt-1">
            Daftarkan titik pusat dan radius. Lokasi ini bisa langsung dipilih saat membuat sesi presensi.
          </p>
        </div>
        <button
          onClick={bukaTambah}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Daftarkan Lokasi
        </button>
      </div>

      {pesan && (
        <div
          className={`flex items-start gap-2 p-3.5 rounded-xl text-xs border ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
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
        <div className="p-12 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white">
          <MapPin className="w-10 h-10 text-slate-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-navy">
            Belum ada lokasi terdaftar
          </p>
          <p className="text-xs text-slate-muted mt-1">
            Tambahkan minimal satu titik agar pembuatan sesi presensi lebih cepat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialLokasi.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-primary">{item.nama}</h3>
                  <p className="text-xs text-slate-muted mt-1 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-secondary" />
                    {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                  </p>
                  <p className="text-xs text-slate-muted mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    radius {item.radiusM} m
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bukaEdit(item)}
                    title="Ubah"
                    className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => hapus(item)}
                    disabled={isPending}
                    title="Hapus"
                    className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
        <Modal
          onClose={() => {
            setModalBuka(false);
            resetForm();
          }}
          ariaLabel={diedit ? "Edit lokasi" : "Tambah lokasi"}
          size="2xl"
        >
          <form onSubmit={simpan} className="flex min-h-0 flex-1 flex-col">
            <ModalHeader
              title={diedit ? `Ubah Lokasi: ${diedit.nama}` : "Daftarkan Lokasi Baru"}
              description="Titik pusat dan radius menjadi nilai awal saat dipilih pada agenda."
              icon={MapPin}
              onClose={() => {
                setModalBuka(false);
                resetForm();
              }}
            />

            <ModalBody>
              <div>
                <label className="mb-1 block text-xs font-semibold text-navy">Nama Lokasi</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  placeholder="Contoh: Auditorium Polines"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy">
                    Radius (meter)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    required
                    value={radiusM}
                    onChange={(e) => setRadiusM(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
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
            </ModalBody>

            <ModalFooter>
              <button
                type="button"
                onClick={() => {
                  setModalBuka(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer transition-all"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {diedit ? "Simpan Perubahan" : "Daftarkan"}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
}
