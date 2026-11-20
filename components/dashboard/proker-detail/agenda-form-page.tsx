// components/dashboard/proker-detail/agenda-form-page.tsx
// Halaman form tambah dan edit agenda kegiatan proker (adsek).
// Desain ringkas, bersih, dan manusiawi tanpa informasi berlebih.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { JenisAgenda, TargetPeserta } from "@prisma/client";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import { buatAgendaAction, ubahAgendaAction } from "@/lib/actions/agenda";
import { jamDariWaktuAgenda } from "@/lib/waktu";
import { keTanggalWib } from "./types";

export interface MasterLokasiItem {
  id: number;
  nama: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
}

export interface AgendaAwalData {
  id: number;
  jenis: JenisAgenda;
  judul: string;
  urutan: number;
  tglPelaksanaan: Date | string;
  tglSelesai: Date | string | null;
  waktuPelaksanaan: Date | string;
  lokasiNama: string | null;
  lokasiId: number | null;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  targetPeserta: TargetPeserta;
}

interface Props {
  proker: {
    id: number;
    nama: string;
    periode: {
      id: number;
      nama: string;
      status: string;
    };
  };
  daftarLokasi: MasterLokasiItem[];
  agendaAwal?: AgendaAwalData | null;
}

const KOORDINAT_POLINES_DEFAULT = { lat: -7.0513, lng: 110.4337 };

const OPSI_JENIS = [
  { value: JenisAgenda.rapat_besar, label: "Rapat Besar" },
  { value: JenisAgenda.rapat_koordinasi, label: "Rapat Koordinasi" },
  { value: JenisAgenda.rapat_pj, label: "Rapat PJ & PI" },
  { value: JenisAgenda.hari_h, label: "Hari H Acara" },
];

const OPSI_TARGET = [
  { value: TargetPeserta.semua_panitia, label: "Semua Panitia" },
  { value: TargetPeserta.hanya_pj_pi, label: "Khusus PJ & PI" },
  { value: TargetPeserta.semua_panitia_sto, label: "Semua STO" },
];

export function AgendaFormPage({ proker, daftarLokasi, agendaAwal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  const isEdit = Boolean(agendaAwal);
  const isReadonly = proker.periode.status === "selesai";

  // Form states
  const [judulAgenda, setJudulAgenda] = useState(agendaAwal?.judul ?? "");
  const [jenisAgenda, setJenisAgenda] = useState<JenisAgenda>(
    agendaAwal?.jenis ?? JenisAgenda.rapat_besar,
  );
  const [urutanAgenda, setUrutanAgenda] = useState<number>(
    agendaAwal?.urutan ?? 1,
  );
  const [tglAgenda, setTglAgenda] = useState(
    agendaAwal?.tglPelaksanaan
      ? keTanggalWib(agendaAwal.tglPelaksanaan)
      : "",
  );
  const [tglSelesaiAgenda, setTglSelesaiAgenda] = useState(
    agendaAwal?.tglSelesai ? keTanggalWib(agendaAwal.tglSelesai) : "",
  );
  const [waktuAgenda, setWaktuAgenda] = useState(
    agendaAwal?.waktuPelaksanaan
      ? jamDariWaktuAgenda(new Date(agendaAwal.waktuPelaksanaan))
      : "15:00",
  );
  const [targetPeserta, setTargetPeserta] = useState<TargetPeserta>(
    agendaAwal?.targetPeserta ?? TargetPeserta.semua_panitia,
  );

  // Lokasi & titik presensi
  const [lokasiAgenda, setLokasiAgenda] = useState(agendaAwal?.lokasiNama ?? "");
  const [lokasiAgendaId, setLokasiAgendaId] = useState(
    agendaAwal?.lokasiId ? String(agendaAwal.lokasiId) : "",
  );
  const [radiusAgenda, setRadiusAgenda] = useState<number>(
    agendaAwal?.radiusM ?? 500,
  );
  const [titikAgenda, setTitikAgenda] = useState<{
    lat: number;
    lng: number;
  } | null>(
    agendaAwal?.lat !== null &&
      agendaAwal?.lat !== undefined &&
      agendaAwal?.lng !== null &&
      agendaAwal?.lng !== undefined
      ? { lat: agendaAwal.lat, lng: agendaAwal.lng }
      : null,
  );

  const titikAgendaAktif = titikAgenda ?? KOORDINAT_POLINES_DEFAULT;

  const pilihLokasiMaster = (idStr: string) => {
    setLokasiAgendaId(idStr);
    if (!idStr) return;
    const l = daftarLokasi.find((item) => String(item.id) === idStr);
    if (l) {
      setLokasiAgenda(l.nama);
      setRadiusAgenda(l.radiusM);
      if (l.lat !== null && l.lng !== null) {
        setTitikAgenda({ lat: l.lat, lng: l.lng });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadonly) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("prokerId", String(proker.id));
    formData.append("judul", judulAgenda);
    formData.append("jenis", jenisAgenda);
    formData.append("urutan", String(urutanAgenda));
    formData.append("tglPelaksanaan", tglAgenda);
    if (tglSelesaiAgenda) {
      formData.append("tglSelesai", tglSelesaiAgenda);
    }
    formData.append("waktuPelaksanaan", waktuAgenda);
    formData.append("targetPeserta", targetPeserta);
    if (lokasiAgenda) formData.append("lokasiNama", lokasiAgenda);
    if (lokasiAgendaId) formData.append("lokasiId", lokasiAgendaId);
    if (titikAgenda) {
      formData.append("lat", String(titikAgenda.lat));
      formData.append("lng", String(titikAgenda.lng));
      formData.append("radiusM", String(radiusAgenda));
    }

    startTransition(async () => {
      const res = isEdit && agendaAwal
        ? await ubahAgendaAction(agendaAwal.id, formData)
        : await buatAgendaAction(proker.id, formData);

      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({
          tipe: "sukses",
          teks: res.pesan || (isEdit ? "Kegiatan berhasil diperbarui" : "Kegiatan berhasil ditambahkan"),
        });
        setTimeout(() => {
          router.push(`/dashboard/proker/${proker.id}`);
          router.refresh();
        }, 600);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12">
      {/* Header Sederhana & Ramah */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/proker/${proker.id}`}
            className="p-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-muted hover:text-navy hover:bg-surface shadow-sm transition-all"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">
              {isEdit ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}
            </h1>
            <p className="text-xs text-slate-muted">
              {proker.nama}
            </p>
          </div>
        </div>

        {isReadonly && (
          <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
            Read-only
          </span>
        )}
      </div>

      {/* Alert Pesan */}
      {pesan && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{pesan.teks}</span>
        </div>
      )}

      {/* Form Utama: 2 Kolom Ringkas Bersebelahan */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
            {/* KOLOM KIRI: Data Kegiatan */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-muted uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#E2E8F0]">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                Data Kegiatan
              </h2>

              {/* Judul & Urutan */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-9 sm:col-span-10">
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Judul Kegiatan
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isReadonly || isPending}
                    placeholder="Contoh: Rapat Pleno 1"
                    value={judulAgenda}
                    onChange={(e) => setJudulAgenda(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Urutan
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={isReadonly || isPending}
                    value={urutanAgenda}
                    onChange={(e) => setUrutanAgenda(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy text-center focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Jenis Kegiatan (Pills Ringkas) */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Jenis Kegiatan
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {OPSI_JENIS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      disabled={isReadonly || isPending}
                      onClick={() => setJenisAgenda(o.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                        jenisAgenda === o.value
                          ? "bg-secondary text-white border-secondary shadow-sm"
                          : "bg-surface/60 text-navy border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isReadonly || isPending}
                    value={tglAgenda}
                    onChange={(e) => setTglAgenda(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Tanggal Selesai <span className="font-normal text-slate-muted">(Opsional)</span>
                  </label>
                  <input
                    type="date"
                    min={tglAgenda || undefined}
                    disabled={isReadonly || isPending}
                    value={tglSelesaiAgenda}
                    onChange={(e) => setTglSelesaiAgenda(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Jam Mulai */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  Jam Mulai (WIB)
                </label>
                <input
                  type="time"
                  required
                  disabled={isReadonly || isPending}
                  value={waktuAgenda}
                  onChange={(e) => setWaktuAgenda(e.target.value)}
                  className="w-full max-w-[140px] px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                />
              </div>

              {/* Target Peserta (Pills Ringkas) */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Akses Presensi
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {OPSI_TARGET.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      disabled={isReadonly || isPending}
                      onClick={() => setTargetPeserta(t.value)}
                      className={`px-2 py-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                        targetPeserta === t.value
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-surface/60 text-navy border-[#E2E8F0] hover:border-slate-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Lokasi & Peta */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                <h2 className="text-xs font-bold text-slate-muted uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                  Titik Presensi &amp; Radius
                </h2>
                <button
                  type="button"
                  onClick={() => setTitikAgenda(KOORDINAT_POLINES_DEFAULT)}
                  className="text-[11px] text-secondary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Pusat Polines
                </button>
              </div>

              {/* Nama Lokasi Pertemuan */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Nama Tempat / Ruang <span className="font-normal text-slate-muted">(Opsional)</span>
                </label>
                <input
                  type="text"
                  disabled={isReadonly || isPending}
                  placeholder="Contoh: Ruang Sidang Utama / Auditorium"
                  value={lokasiAgenda}
                  onChange={(e) => setLokasiAgenda(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                />
              </div>

              {/* Master Lokasi & Radius Presensi */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Master Lokasi
                  </label>
                  <select
                    value={lokasiAgendaId}
                    disabled={isReadonly || isPending}
                    onChange={(e) => pilihLokasiMaster(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  >
                    <option value="">-- Pilih Titik --</option>
                    {daftarLokasi.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Radius (meter)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    disabled={isReadonly || isPending}
                    value={radiusAgenda}
                    onChange={(e) => setRadiusAgenda(parseInt(e.target.value) || 500)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy font-semibold focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Peta Ringkas */}
              <div className="rounded-2xl border border-[#CBD5E1] overflow-hidden">
                <PetaPilihLokasi
                  lat={titikAgendaAktif.lat}
                  lng={titikAgendaAktif.lng}
                  radiusM={radiusAgenda}
                  tinggi="250px"
                  onPilih={(lat, lng) => setTitikAgenda({ lat, lng })}
                />
              </div>
            </div>
          </div>

          {/* Footer Tombol Simpan & Batal */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <Link
              href={`/dashboard/proker/${proker.id}`}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-slate-muted hover:text-navy hover:bg-surface transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isReadonly || isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? "Perbarui Kegiatan" : "Simpan Kegiatan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
