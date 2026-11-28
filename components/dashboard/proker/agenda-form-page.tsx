// components/dashboard/proker-detail/agenda-form-page.tsx
// Halaman form tambah dan edit agenda kegiatan proker (adsek).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { JenisAgenda, TargetPeserta, KategoriProker } from "@prisma/client";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import { buatAgendaAction, ubahAgendaAction } from "@/lib/actions/agenda";
import { jamDariWaktuAgenda } from "@/lib/waktu";
import { keTanggalWib, getLabelKategori } from "./types";

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
    kategori?: KategoriProker | "proker" | "agenda" | null;
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

const OPSI_JENIS: {
  value: JenisAgenda;
  label: string;
  keterangan: string;
  berpoin: boolean;
}[] = [
  {
    value: JenisAgenda.hari_h,
    label: "Hari H Acara",
    keterangan: "Pelaksanaan utama kegiatan",
    berpoin: true,
  },
  {
    value: JenisAgenda.rapat_besar,
    label: "Rapat Besar (Rabes)",
    keterangan: "Rapat pleno seluruh panitia",
    berpoin: false,
  },
  {
    value: JenisAgenda.rapat_koordinasi,
    label: "Rapat Koordinasi (Rakoor)",
    keterangan: "Koordinasi teknis panitia/divisi",
    berpoin: false,
  },
  {
    value: JenisAgenda.rapat_pj,
    label: "Rapat PJ & PI",
    keterangan: "Rapat Pimpinan Inti & PJ Divisi",
    berpoin: false,
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
  const labels = getLabelKategori(proker.kategori);

  const opsiTarget = [
    {
      value: TargetPeserta.semua_panitia,
      label: `Semua Panitia`,
      keterangan: `Seluruh panitia ${labels.lengkap} ini`,
    },
    {
      value: TargetPeserta.hanya_pj_pi,
      label: "Khusus PJ & PI",
      keterangan: "Ketua, Sekretaris, Bendahara, PJ",
    },
    {
      value: TargetPeserta.semua_panitia_sto,
      label: "Seluruh STO",
      keterangan: "Semua pengurus periode aktif",
    },
  ];

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
      {/* Header Card (selaras dengan halaman detail proker) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
            <Link
              href={`/dashboard/proker/${proker.id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Detail {labels.singkat}
            </Link>
            <span className="text-slate-muted text-xs">•</span>
            <span className="text-xs font-semibold text-secondary">
              {proker.periode.nama}
            </span>
            <span className="text-slate-muted text-xs">•</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                labels.isAgenda
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {labels.kategoriLabel}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {isEdit ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}
          </h1>
        </div>

        {isReadonly && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-highlight/15 text-primary text-xs font-semibold border border-highlight/40 self-start sm:self-auto">
            <AlertCircle className="w-4 h-4 text-highlight shrink-0" />
            <span>Periode selesai (Read-only)</span>
          </div>
        )}
      </div>

      {/* Notifikasi */}
      {pesan && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs shadow-sm ${
            pesan.tipe === "sukses"
              ? "bg-accent/15 border-accent/40 text-primary"
              : "bg-highlight/15 border-highlight/40 text-primary"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-secondary" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-highlight" />
          )}
          <span className="font-medium leading-relaxed">{pesan.teks}</span>
        </div>
      )}

      {/* Form 2 Kolom */}
      <form id="form-agenda" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Kolom Kiri: Informasi, Jadwal & Peserta */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-5">
              {/* Judul Kegiatan */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Nama Kegiatan <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isReadonly || isPending}
                  placeholder="Contoh: Rapat Pleno 1 / Hari H Seminar Nasional"
                  value={judulAgenda}
                  onChange={(e) => setJudulAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy placeholder:text-slate-muted/70 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                />
              </div>

              {/* Jenis Kegiatan */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-2">
                  Jenis Kegiatan <span className="text-secondary">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {OPSI_JENIS.map((item) => {
                    const aktif = jenisAgenda === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        disabled={isReadonly || isPending}
                        onClick={() => setJenisAgenda(item.value)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed ${
                          aktif
                            ? "border-secondary bg-secondary/5 ring-1 ring-secondary/30"
                            : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-surface/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold ${
                              aktif ? "text-primary" : "text-navy"
                            }`}
                          >
                            {item.label}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                              item.berpoin
                                ? "bg-highlight/20 text-primary"
                                : "bg-surface text-slate-muted"
                            }`}
                          >
                            {item.berpoin ? "Berpoin" : "0 Poin"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-muted mt-1">
                          {item.keterangan}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tanggal & Jam */}
              <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Tanggal Mulai <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isReadonly || isPending}
                    value={tglAgenda}
                    onChange={(e) => setTglAgenda(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Tanggal Selesai{" "}
                    <span className="font-normal text-slate-muted">
                      (Opsional)
                    </span>
                  </label>
                  <input
                    type="date"
                    min={tglAgenda || undefined}
                    disabled={isReadonly || isPending}
                    value={tglSelesaiAgenda}
                    onChange={(e) => setTglSelesaiAgenda(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Jam Mulai (WIB) <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    disabled={isReadonly || isPending}
                    value={waktuAgenda}
                    onChange={(e) => setWaktuAgenda(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Target Peserta */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <label className="block text-xs font-semibold text-navy mb-2">
                  Peserta Wajib Hadir <span className="text-secondary">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {opsiTarget.map((item) => {
                    const aktif = targetPeserta === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        disabled={isReadonly || isPending}
                        onClick={() => setTargetPeserta(item.value)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed ${
                          aktif
                            ? "border-primary bg-primary text-white"
                            : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-surface/60 text-navy"
                        }`}
                      >
                        <p
                          className={`text-xs font-bold ${
                            aktif ? "text-white" : "text-navy"
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-[11px] mt-1 leading-snug ${
                            aktif ? "text-white/80" : "text-slate-muted"
                          }`}
                        >
                          {item.keterangan}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Lokasi & Titik Presensi */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-primary">
                  Lokasi &amp; Titik Presensi
                </h2>
                <button
                  type="button"
                  onClick={() => setTitikAgenda(KOORDINAT_POLINES_DEFAULT)}
                  className="text-[11px] text-secondary hover:text-primary inline-flex items-center gap-1 cursor-pointer font-semibold transition-colors"
                  title="Kembalikan koordinat ke Kampus Polines"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset ke Polines
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Pilih dari Master Lokasi
                </label>
                <select
                  value={lokasiAgendaId}
                  disabled={isReadonly || isPending}
                  onChange={(e) => pilihLokasiMaster(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60 cursor-pointer"
                >
                  <option value="">-- Atur titik manual / pilih lokasi --</option>
                  {daftarLokasi.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nama} ({l.radiusM} m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Nama Tempat / Ruang
                  </label>
                  <input
                    type="text"
                    disabled={isReadonly || isPending}
                    placeholder="Contoh: Gedung PKM Lt. 2"
                    value={lokasiAgenda}
                    onChange={(e) => setLokasiAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy placeholder:text-slate-muted/70 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Radius (m)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    disabled={isReadonly || isPending}
                    value={radiusAgenda}
                    onChange={(e) =>
                      setRadiusAgenda(parseInt(e.target.value, 10) || 500)
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-muted mb-1.5">
                  <span>Klik peta untuk memindahkan titik pusat</span>
                  <span className="font-mono text-[10px]">
                    {titikAgendaAktif.lat.toFixed(5)}, {titikAgendaAktif.lng.toFixed(5)}
                  </span>
                </div>
                <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
                  <PetaPilihLokasi
                    lat={titikAgendaAktif.lat}
                    lng={titikAgendaAktif.lng}
                    radiusM={radiusAgenda}
                    tinggi="240px"
                    onPilih={(lat, lng) => setTitikAgenda({ lat, lng })}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-muted leading-relaxed">
                Presensi di luar radius tetap tercatat dan ditandai menunggu verifikasi AdSek.
              </p>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
                <Link
                  href={`/dashboard/proker/${proker.id}`}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-slate-muted hover:text-navy hover:bg-surface text-center transition-colors cursor-pointer"
                >
                  Batal
                </Link>

                <button
                  type="submit"
                  disabled={isReadonly || isPending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isEdit ? "Simpan Perubahan" : "Simpan Kegiatan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
