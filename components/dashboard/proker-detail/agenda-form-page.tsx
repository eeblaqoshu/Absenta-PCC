// components/dashboard/proker-detail/agenda-form-page.tsx
// Halaman form tambah dan edit agenda kegiatan proker (adsek).
// Menggantikan modal popup agar pengaturan detail dan pemilihan titik radius presensi
// di peta Leaflet lebih leluasa dan nyaman.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
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

export function AgendaFormPage({ proker, daftarLokasi, agendaAwal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  const isEdit = Boolean(agendaAwal);
  const isReadonly = proker.periode.status === "selesai";

  // State form
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

  // State lokasi & titik presensi
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

  const titikAgendaAktif = titikAgenda ?? { lat: -7.0513, lng: 110.4337 };

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
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setPesan({
          tipe: "sukses",
          teks: res.pesan || (isEdit ? "Agenda berhasil diperbarui" : "Agenda berhasil ditambahkan"),
        });
        setTimeout(() => {
          router.push(`/dashboard/proker/${proker.id}`);
          router.refresh();
        }, 700);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Tombol Kembali & Breadcrumb */}
      <div>
        <Link
          href={`/dashboard/proker/${proker.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-muted hover:text-navy transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Detail Proker
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </span>
              {isEdit ? "Edit Agenda Kegiatan" : "Tambah Agenda Kegiatan Baru"}
            </h1>
            <p className="text-xs text-slate-muted mt-1">
              Program Kerja:{" "}
              <span className="font-semibold text-navy">{proker.nama}</span>
              {" • "}Titik presensi diatur di sini; semua sesi memakai titik yang sama.
            </p>
          </div>
          {isReadonly && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold inline-flex items-center gap-1.5 self-start">
              <AlertCircle className="w-4 h-4" />
              Periode Selesai (Read-only)
            </div>
          )}
        </div>
      </div>

      {/* Alert Notifikasi */}
      {pesan && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <div className="font-medium pt-0.5">{pesan.teks}</div>
        </div>
      )}

      {/* Form Utama */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Detail Informasi Agenda */}
          <div className="lg:col-span-6 space-y-5">
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-primary tracking-tight pb-2 border-b border-[#E2E8F0] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-secondary" />
                Informasi Kegiatan
              </h2>

              {/* Judul Agenda */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Judul Agenda <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isReadonly || isPending}
                  placeholder="Contoh: Rapat Pleno 1 Persiapan Lomba"
                  value={judulAgenda}
                  onChange={(e) => setJudulAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                />
              </div>

              {/* Jenis Agenda & Urutan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Jenis Agenda <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={jenisAgenda}
                    disabled={isReadonly || isPending}
                    onChange={(e) => setJenisAgenda(e.target.value as JenisAgenda)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                  >
                    <option value={JenisAgenda.rapat_pj}>Rapat PJ &amp; PI</option>
                    <option value={JenisAgenda.rapat_besar}>Rapat Besar</option>
                    <option value={JenisAgenda.rapat_koordinasi}>
                      Rapat Koordinasi
                    </option>
                    <option value={JenisAgenda.hari_h}>Hari H Pelaksanaan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Urutan
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={isReadonly || isPending}
                    value={urutanAgenda}
                    onChange={(e) => setUrutanAgenda(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Tanggal Mulai & Tanggal Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    min={tglAgenda || undefined}
                    disabled={isReadonly || isPending}
                    value={tglSelesaiAgenda}
                    onChange={(e) => setTglSelesaiAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-muted">
                Biarkan tanggal selesai kosong bila agenda hanya satu hari. Agenda multi-hari boleh memiliki sesi presensi di tanggal mana pun di dalam rentang ini.
              </p>

              {/* Jam Mulai Agenda */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  Jam Mulai Agenda (WIB) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  disabled={isReadonly || isPending}
                  value={waktuAgenda}
                  onChange={(e) => setWaktuAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                />
              </div>

              {/* Target Peserta */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-secondary" />
                  Target Peserta (Akses Presensi) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetPeserta}
                  disabled={isReadonly || isPending}
                  onChange={(e) => setTargetPeserta(e.target.value as TargetPeserta)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                >
                  <option value={TargetPeserta.hanya_pj_pi}>
                    hanya_pj_pi (Hanya Panitia berstatus PJ dan PI)
                  </option>
                  <option value={TargetPeserta.semua_panitia}>
                    semua_panitia (Seluruh panitia terdaftar di proker ini)
                  </option>
                  <option value={TargetPeserta.semua_panitia_sto}>
                    semua_panitia_sto (Semua anggota STO satu periode)
                  </option>
                </select>
                <p className="text-[11px] text-slate-muted mt-1.5 leading-relaxed">
                  Aturan akses ini menentukan siapa saja yang dapat melihat agenda ini di beranda STO dan berhak melakukan scan presensi.
                </p>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Titik Presensi & Peta Interaktif Leaflet */}
          <div className="lg:col-span-6 space-y-5">
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-primary tracking-tight pb-2 border-b border-[#E2E8F0] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-secondary" />
                Titik Presensi &amp; Lokasi
              </h2>

              {/* Lokasi Pertemuan */}
              <div>
                <label className="block text-xs font-semibold text-navy mb-1.5">
                  Nama Lokasi / Ruang Pertemuan (Opsional)
                </label>
                <input
                  type="text"
                  disabled={isReadonly || isPending}
                  placeholder="Contoh: Ruang Sidang Utama Lt. 2 / Auditorium"
                  value={lokasiAgenda}
                  onChange={(e) => setLokasiAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                />
              </div>

              {/* Dropdown Master Lokasi & Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Pilih Master Lokasi
                  </label>
                  <select
                    value={lokasiAgendaId}
                    disabled={isReadonly || isPending}
                    onChange={(e) => pilihLokasiMaster(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                  >
                    <option value="">-- Titik manual (peta) --</option>
                    {daftarLokasi.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nama} (radius {l.radiusM} m)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Radius Presensi (meter)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    disabled={isReadonly || isPending}
                    value={radiusAgenda}
                    onChange={(e) =>
                      setRadiusAgenda(parseInt(e.target.value) || 500)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Peta Interaktif Leaflet */}
              <div className="rounded-2xl border border-[#E2E8F0] p-3.5 bg-surface/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-muted">
                  <span>Klik atau seret pin pada peta untuk menentukan titik koordinat presensi.</span>
                  {titikAgenda && (
                    <span className="font-mono text-[10px] text-primary bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      {titikAgenda.lat.toFixed(4)}, {titikAgenda.lng.toFixed(4)}
                    </span>
                  )}
                </div>

                <div className="rounded-xl overflow-hidden border border-[#CBD5E1]">
                  <PetaPilihLokasi
                    lat={titikAgendaAktif.lat}
                    lng={titikAgendaAktif.lng}
                    radiusM={radiusAgenda}
                    tinggi="320px"
                    onPilih={(lat, lng) => setTitikAgenda({ lat, lng })}
                  />
                </div>

                <p className="text-[10px] text-slate-muted leading-relaxed">
                  Titik presensi melekat pada agenda (bukan sesi). Semua sesi di bawah agenda ini akan memakai titik koordinat &amp; batas radius yang sama.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar / Tombol Simpan */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Link
            href={`/dashboard/proker/${proker.id}`}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-slate-muted hover:text-navy hover:bg-surface text-center transition-colors"
          >
            Batal
          </Link>
          <div className="w-full sm:w-auto flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isReadonly || isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Perbarui Agenda" : "Simpan Agenda"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
