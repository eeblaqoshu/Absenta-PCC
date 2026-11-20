// components/dashboard/proker-detail/agenda-form-page.tsx
// Halaman form tambah dan edit agenda kegiatan proker (adsek).
// Desain clean, padat (compact), eksklusif, dan informatif.
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
  Users,
  GitMerge,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  Globe,
  UserCheck,
  SlidersHorizontal,
  Building2,
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
  {
    value: JenisAgenda.rapat_besar,
    label: "Rapat Besar",
    deskripsi: "Pertemuan akbar melibatkan seluruh panitia & pengurus.",
    icon: Users,
  },
  {
    value: JenisAgenda.rapat_koordinasi,
    label: "Rapat Koordinasi",
    deskripsi: "Sinkronisasi teknis & pembagian tugas antar divisi kerja.",
    icon: GitMerge,
  },
  {
    value: JenisAgenda.rapat_pj,
    label: "Rapat PJ & PI",
    deskripsi: "Pengarahan intensif khusus Pimpinan Inti & PJ Divisi.",
    icon: ShieldCheck,
  },
  {
    value: JenisAgenda.hari_h,
    label: "Hari H Acara",
    deskripsi: "Puncak pelaksanaan agenda utama program kerja.",
    icon: Sparkles,
  },
];

const OPSI_TARGET = [
  {
    value: TargetPeserta.semua_panitia,
    label: "Semua Panitia",
    keterangan: "Khusus fungsionaris di SK kepanitiaan proker ini.",
    icon: UserCheck,
  },
  {
    value: TargetPeserta.hanya_pj_pi,
    label: "Khusus PJ & PI",
    keterangan: "Terbatas untuk Pimpinan Inti & PJ Divisi saja.",
    icon: ShieldAlert,
  },
  {
    value: TargetPeserta.semua_panitia_sto,
    label: "Seluruh STO",
    keterangan: "Terbuka bagi seluruh pengurus periode aktif.",
    icon: Globe,
  },
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
  const [urutanAgenda] = useState<number>(agendaAwal?.urutan ?? 1);
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
      const res =
        isEdit && agendaAwal
          ? await ubahAgendaAction(agendaAwal.id, formData)
          : await buatAgendaAction(proker.id, formData);

      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({
          tipe: "sukses",
          teks:
            res.pesan ||
            (isEdit
              ? "Kegiatan berhasil diperbarui"
              : "Kegiatan berhasil ditambahkan"),
        });
        setTimeout(() => {
          router.push(`/dashboard/proker/${proker.id}`);
          router.refresh();
        }, 600);
      }
    });
  };

  return (
    <div className="space-y-5 pb-16 font-sans">
      {/* Navigasi Kembali */}
      <div>
        <Link
          href={`/dashboard/proker/${proker.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Detail Proker
        </Link>
      </div>

      {/* Header Banner Card Terpadu dengan Action Buttons */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-muted">
              Portal Agenda Kegiatan Program Kerja
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {isEdit ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            {proker.nama} • Periode {proker.periode.nama}
          </p>
        </div>

        {/* Action Buttons di Header: Terasa Padat & Efisien */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {isReadonly && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Read-only</span>
            </div>
          )}

          <Link
            href={`/dashboard/proker/${proker.id}`}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </Link>

          <button
            type="submit"
            form="form-agenda"
            disabled={isReadonly || isPending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-xs shadow-secondary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Perbarui Kegiatan" : "Simpan Kegiatan"}
          </button>
        </div>
      </div>

      {/* Alert Pesan Sukses / Error */}
      {pesan && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs shadow-sm transition-all ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span className="font-medium leading-relaxed">{pesan.teks}</span>
        </div>
      )}

      {/* Form Utama: 2 Kolom Seimbang & Padat */}
      <form id="form-agenda" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ========================================================= */}
          {/* KOLOM KIRI: Informasi Kegiatan & Akses Presensi */}
          {/* ========================================================= */}
          <div className="space-y-5">
            {/* Card 1: Detail & Jenis Kegiatan */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-secondary flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-navy">
                    Detail &amp; Jenis Kegiatan
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Nama kegiatan dan klasifikasi jenis pertemuan.
                  </p>
                </div>
              </div>

              {/* Judul Kegiatan */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Judul Kegiatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isReadonly || isPending}
                  placeholder="Contoh: Rapat Pleno 1 & Pembagian Jobdesk"
                  value={judulAgenda}
                  onChange={(e) => setJudulAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                />
              </div>

              {/* Jenis Kegiatan (4 Pilihan Visual) */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-2">
                  Pilih Jenis Kegiatan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {OPSI_JENIS.map((item) => {
                    const Icon = item.icon;
                    const aktif = jenisAgenda === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        disabled={isReadonly || isPending}
                        onClick={() => setJenisAgenda(item.value)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 disabled:cursor-not-allowed ${
                          aktif
                            ? "border-secondary bg-gradient-to-br from-blue-50/70 to-white shadow-xs ring-1 ring-secondary/30"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                              aktif
                                ? "bg-secondary text-white shadow-xs"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              aktif
                                ? "bg-blue-100 text-secondary"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {aktif ? "Terpilih" : "Pilih"}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-navy">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                            {item.deskripsi}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 2: Jadwal Pelaksanaan */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-navy">
                    Jadwal &amp; Waktu
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Rentang tanggal dan jam pelaksanaan dalam zona WIB.
                  </p>
                </div>
              </div>

              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Tanggal Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isReadonly || isPending}
                    value={tglAgenda}
                    onChange={(e) => setTglAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Tanggal Selesai{" "}
                    <span className="font-normal text-slate-400">
                      (Opsional)
                    </span>
                  </label>
                  <input
                    type="date"
                    min={tglAgenda || undefined}
                    disabled={isReadonly || isPending}
                    value={tglSelesaiAgenda}
                    onChange={(e) => setTglSelesaiAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Jam Mulai WIB */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Jam Mulai Pelaksanaan (WIB){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    required
                    disabled={isReadonly || isPending}
                    value={waktuAgenda}
                    onChange={(e) => setWaktuAgenda(e.target.value)}
                    className="w-36 px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                  <span className="text-xs text-slate-500">
                    WIB (Waktu Indonesia Barat)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Kebijakan Akses Presensi */}
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-navy">
                    Kebijakan Akses Presensi
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Menentukan siapa saja yang berhak scan presensi.
                  </p>
                </div>
              </div>

              {/* 3 Opsi Target */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {OPSI_TARGET.map((item) => {
                  const Icon = item.icon;
                  const aktif = targetPeserta === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isReadonly || isPending}
                      onClick={() => setTargetPeserta(item.value)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 disabled:cursor-not-allowed ${
                        aktif
                          ? "border-primary bg-primary text-white shadow-sm ring-1 ring-primary"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 text-navy"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            aktif
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {aktif && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-xs font-bold ${
                            aktif ? "text-white" : "text-navy"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-[10px] leading-snug mt-1 ${
                            aktif ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {item.keterangan}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info Banner Konfirmasi Izin */}
              <div className="p-3 flex items-start gap-2.5 text-[11px] text-blue-900 leading-relaxed">
                <div>
                  <span className="font-bold">Info: </span>
                  {targetPeserta === TargetPeserta.semua_panitia && (
                    <span>
                      Hanya pengurus yang tercatat di kepanitiaan{" "}
                      <strong>{proker.nama}</strong> yang dapat mengakses presensi.
                    </span>
                  )}
                  {targetPeserta === TargetPeserta.hanya_pj_pi && (
                    <span>
                      Hanya Ketua, Sekretaris, Bendahara, dan PJ Divisi
                      kepanitiaan <strong>{proker.nama}</strong> yang dapat
                      mengakses presensi.
                    </span>
                  )}
                  {targetPeserta === TargetPeserta.semua_panitia_sto && (
                    <span>
                      Seluruh fungsionaris STO dalam periode{" "}
                      <strong>{proker.periode.nama}</strong> memiliki hak akses
                      presensi.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* KOLOM KANAN: Lokasi & Validasi Presensi GPS */}
          {/* ========================================================= */}
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-navy">
                      Titik Presensi &amp; Radius
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Geofencing presensi berbasis GPS.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTitikAgenda(KOORDINAT_POLINES_DEFAULT)}
                  className="text-[11px] text-secondary hover:text-navy hover:underline flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                  title="Kembalikan koordinat ke Kampus Pusat Polines"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Pusat Polines
                </button>
              </div>

              {/* Master Lokasi Preset */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1">
                  Master Titik Lokasi
                </label>
                <select
                  value={lokasiAgendaId}
                  disabled={isReadonly || isPending}
                  onChange={(e) => pilihLokasiMaster(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60 cursor-pointer"
                >
                  <option value="">-- Pilih Titik Lokasi Master --</option>
                  {daftarLokasi.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nama} (Radius: {l.radiusM}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Tempat / Ruangan */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Nama Tempat / Ruang{" "}
                  <span className="font-normal text-slate-400">
                    (Opsional/Kustom)
                  </span>
                </label>
                <input
                  type="text"
                  disabled={isReadonly || isPending}
                  placeholder="Contoh: Gedung PKM Lantai 2 / Ruang Sidang Jurusan"
                  value={lokasiAgenda}
                  onChange={(e) => setLokasiAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                />
              </div>

              {/* Radius Toleransi (meter) - Bersih tanpa preset chips */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Radius Toleransi (meter)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    disabled={isReadonly || isPending}
                    value={radiusAgenda}
                    onChange={(e) =>
                      setRadiusAgenda(parseInt(e.target.value) || 500)
                    }
                    className="w-32 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                  <span className="text-xs text-slate-500">
                    meter dari titik pusat
                  </span>
                </div>
              </div>

              {/* Peta Interaktif Leaflet */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                  <span>Klik pada peta untuk menentukan titik koordinat:</span>
                  <span className="font-mono text-[10px]">
                    {titikAgendaAktif.lat.toFixed(4)}, {titikAgendaAktif.lng.toFixed(4)}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <PetaPilihLokasi
                    lat={titikAgendaAktif.lat}
                    lng={titikAgendaAktif.lng}
                    radiusM={radiusAgenda}
                    tinggi="260px"
                    onPilih={(lat, lng) => setTitikAgenda({ lat, lng })}
                  />
                </div>
              </div>

              {/* Info Geofencing Sesuai Aturan PRD */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-700">Catatan :</span> Peserta
                yang berada di luar radius tidak dapat melakukan presensi
              </div>

              {/* Tombol Aksi di Bawah Kartu Lokasi: Padat & Terintegrasi */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Link
                  href={`/dashboard/proker/${proker.id}`}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-navy hover:bg-slate-50 text-center transition-colors cursor-pointer"
                >
                  Batal
                </Link>

                <button
                  type="submit"
                  disabled={isReadonly || isPending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-xs shadow-secondary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isEdit ? "Perbarui Kegiatan" : "Simpan Kegiatan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
