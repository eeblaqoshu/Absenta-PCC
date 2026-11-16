// components/dashboard/proker-detail.tsx
"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  tambahPanitiaAction,
  ubahPanitiaAction,
  hapusPanitiaAction,
} from "@/lib/actions/proker";
import {
  buatAgendaAction,
  ubahAgendaAction,
  hapusAgendaAction,
} from "@/lib/actions/agenda";
import { PeranPanitia, JenisAgenda, TargetPeserta, StatusPeriode } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { konfirmasiHapus } from "@/lib/swal";
import { SesiModal, type LokasiOption, type SesiItem } from "@/components/dashboard/sesi-modal";
import { AgendaStatusTabs } from "@/components/agenda-status-tabs";
import { EmptyAgenda } from "@/components/empty-agenda";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import {
  hitungStatusAgenda,
  hitungStatusSesi,
  formatTanggalIndo,
  jamDariWaktuAgenda,
  keInputLokalWib,
  type StatusAgendaDihitung,
} from "@/lib/waktu";
import type { RekapKehadiranSesi } from "@/lib/kehadiran";
import {
  Users,
  Calendar,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  QrCode,
  Pencil,
} from "lucide-react";
import Link from "next/link";

interface PanitiaItem {
  id: number;
  peran: PeranPanitia;
  divisiPanitia: string | null;
  sto: {
    id: number;
    nama: string;
    nim: string;
    emailGoogle: string;
    jabatan: string | null;
    divisi: string | null;
  };
}

interface SesiRingkas {
  id: number;
  bukaAt: Date;
  tutupAt: Date;
}

interface AgendaItem {
  id: number;
  jenis: JenisAgenda;
  judul: string;
  urutan: number;
  tglPelaksanaan: Date;
  tglSelesai: Date | null;
  waktuPelaksanaan: Date;
  lokasiNama: string | null;
  lokasiId: number | null;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  targetPeserta: TargetPeserta;
  statusDihitung: "akan_datang" | "sedang_berlangsung" | "selesai";
  sesi: SesiRingkas[];
}

interface StoOption {
  id: number;
  nama: string;
  nim: string;
  divisi: string | null;
}

// Denyut waktu untuk menghitung ulang status agenda (tiada render loop).
const DETAK_MS = 30_000;
function langgananDetak(cb: () => void) {
  const t = setInterval(cb, DETAK_MS);
  return () => clearInterval(t);
}
function cuplikanDetak() {
  return Math.floor(Date.now() / DETAK_MS);
}

/** Jam "HH:mm" (WIB) dari sebuah Date — dipakai kartu agenda. */
function keInputJam(date: Date | string): string {
  return keInputLokalWib(new Date(date)).split("T")[1] ?? "00:00";
}

/** Tanggal "YYYY-MM-DD" (WIB) dari sebuah Date. */
function keTanggalWib(date: Date | string): string {
  return keInputLokalWib(new Date(date)).split("T")[0] ?? "";
}

export function ProkerDetail({
  proker,
  availableStos,
  daftarLokasi,
  rekap,
}: {
  proker: {
    id: number;
    nama: string;
    deskripsi: string | null;
    periode: {
      id: number;
      nama: string;
      status: StatusPeriode;
    };
    kepanitiaan: PanitiaItem[];
    agenda: AgendaItem[];
  };
  availableStos: StoOption[];
  daftarLokasi: LokasiOption[];
  /** Rekap kehadiran per SESI (key = sesiId). */
  rekap: Record<number, RekapKehadiranSesi>;
}) {
  const [tabAktif, setTabAktif] = useState<"panitia" | "agenda">("panitia");
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);

  const isReadonly = proker.periode.status === StatusPeriode.selesai;

  // ─────────────────────────────────────────────
  // STATUS AGENDA (dihitung dari rentang tanggal + jam agenda)
  // ─────────────────────────────────────────────
  const [tabStatus, setTabStatus] = useState<StatusAgendaDihitung>("akan_datang");

  const detak = useSyncExternalStore(langgananDetak, cuplikanDetak, () => 0);
  const now = useMemo(() => (detak > 0 ? new Date(detak * DETAK_MS) : null), [detak]);

  const agendaBerstatus = useMemo(() => {
    return proker.agenda.map((a) => {
      const statusLive =
        now === null
          ? a.statusDihitung
          : hitungStatusAgenda(a.tglPelaksanaan, a.waktuPelaksanaan, a.tglSelesai, now);
      return { ...a, statusLive };
    });
  }, [proker.agenda, now]);

  const kelompokAgenda = useMemo(
    () => ({
      sedang_berlangsung: agendaBerstatus.filter((a) => a.statusLive === "sedang_berlangsung"),
      akan_datang: agendaBerstatus.filter((a) => a.statusLive === "akan_datang"),
      selesai: agendaBerstatus.filter((a) => a.statusLive === "selesai"),
    }),
    [agendaBerstatus]
  );

  const tabEfektif: StatusAgendaDihitung =
    kelompokAgenda[tabStatus].length > 0
      ? tabStatus
      : (["sedang_berlangsung", "akan_datang", "selesai"] as StatusAgendaDihitung[]).find(
        (k) => kelompokAgenda[k].length > 0
      ) ?? tabStatus;

  const agendaTerlihat = kelompokAgenda[tabEfektif];

  // ─────────────────────────────────────────────
  // MODAL SESI PRESENSI & DAFTAR HADIR
  // ─────────────────────────────────────────────
  const [modalSesi, setModalSesi] = useState<{
    agenda: AgendaItem;
    sesiAwal: SesiItem | null;
  } | null>(null);

  // ─────────────────────────────────────────────
  // MODAL PANITIA STATE
  // ─────────────────────────────────────────────
  const [modalPanitiaBuka, setModalPanitiaBuka] = useState(false);
  const [modalEditPanitiaBuka, setModalEditPanitiaBuka] = useState(false);
  const [panitiaDiedit, setPanitiaDiedit] = useState<PanitiaItem | null>(null);

  const [pilihanStoId, setPilihanStoId] = useState<string>("");
  const [peranPanitia, setPeranPanitia] = useState<PeranPanitia>(PeranPanitia.anggota);
  const [divisiPanitia, setDivisiPanitia] = useState("");

  // ─────────────────────────────────────────────
  // MODAL AGENDA STATE
  // ─────────────────────────────────────────────
  const [modalAgendaBuka, setModalAgendaBuka] = useState(false);
  const [modalEditAgendaBuka, setModalEditAgendaBuka] = useState(false);
  const [agendaDiedit, setAgendaDiedit] = useState<AgendaItem | null>(null);

  const [judulAgenda, setJudulAgenda] = useState("");
  const [jenisAgenda, setJenisAgenda] = useState<JenisAgenda>(JenisAgenda.rapat_besar);
  const [urutanAgenda, setUrutanAgenda] = useState<number>(1);
  const [tglAgenda, setTglAgenda] = useState("");
  const [tglSelesaiAgenda, setTglSelesaiAgenda] = useState("");
  const [waktuAgenda, setWaktuAgenda] = useState("15:00");
  const [lokasiAgenda, setLokasiAgenda] = useState("");
  const [lokasiAgendaId, setLokasiAgendaId] = useState("");
  const [radiusAgenda, setRadiusAgenda] = useState<number>(500);
  const [titikAgenda, setTitikAgenda] = useState<{ lat: number; lng: number } | null>(null);
  const [targetPeserta, setTargetPeserta] = useState<TargetPeserta>(TargetPeserta.semua_panitia);

  const titikAgendaAktif = titikAgenda ?? { lat: -7.0513, lng: 110.4337 };

  // ─────────────────────────────────────────────
  // FILTER STO YANG BELUM TERDAFTAR DI PROKER
  // ─────────────────────────────────────────────
  const panitiaStoIdSet = new Set(proker.kepanitiaan.map((k) => k.sto.id));
  const stoBelumMasuk = availableStos.filter((s) => !panitiaStoIdSet.has(s.id));

  // Handler Panitia
  const handleSubmitTambahPanitia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilihanStoId) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("prokerId", proker.id.toString());
    formData.append("stoId", pilihanStoId);
    formData.append("peran", peranPanitia);
    formData.append("divisiPanitia", divisiPanitia);

    startTransition(async () => {
      const res = await tambahPanitiaAction(formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalPanitiaBuka(false);
        setPilihanStoId("");
        setDivisiPanitia("");
      }
    });
  };

  const handleOpenEditPanitia = (item: PanitiaItem) => {
    setPanitiaDiedit(item);
    setPeranPanitia(item.peran);
    setDivisiPanitia(item.divisiPanitia || "");
    setModalEditPanitiaBuka(true);
  };

  const handleSubmitEditPanitia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panitiaDiedit) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("peran", peranPanitia);
    formData.append("divisiPanitia", divisiPanitia);

    startTransition(async () => {
      const res = await ubahPanitiaAction(panitiaDiedit.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalEditPanitiaBuka(false);
      }
    });
  };

  const handleHapusPanitia = async (kepanitiaanId: number, namaSto: string) => {
    const setuju = await konfirmasiHapus({
      judul: "Hapus dari Kepanitiaan?",
      pesan: `Anda yakin ingin menghapus "${namaSto}" dari kepanitiaan proker ini?`,
      tombolHapus: "Ya, Hapus Panitia",
    });
    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusPanitiaAction(kepanitiaanId);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
      }
    });
  };

  // Handler Agenda
  const resetFormAgenda = () => {
    setJudulAgenda("");
    setJenisAgenda(JenisAgenda.rapat_besar);
    setUrutanAgenda(proker.agenda.length + 1);
    setTglAgenda("");
    setTglSelesaiAgenda("");
    setWaktuAgenda("15:00");
    setLokasiAgenda("");
    setLokasiAgendaId("");
    setRadiusAgenda(500);
    setTitikAgenda(null);
    setTargetPeserta(TargetPeserta.semua_panitia);
    setAgendaDiedit(null);
  };

  /** Pilih master lokasi -> isi nama, radius, dan titik peta. */
  const pilihLokasiMaster = (idMentah: string) => {
    setLokasiAgendaId(idMentah);
    if (!idMentah) return;
    const lok = daftarLokasi.find((l) => l.id === Number(idMentah));
    if (!lok) return;
    setLokasiAgenda(lok.nama);
    setRadiusAgenda(lok.radiusM);
    setTitikAgenda({ lat: lok.lat, lng: lok.lng });
  };

  const handleSubmitTambahAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
    formData.append("prokerId", proker.id.toString());
    formData.append("judul", judulAgenda);
    formData.append("jenis", jenisAgenda);
    formData.append("urutan", urutanAgenda.toString());
    formData.append("tglPelaksanaan", tglAgenda);
    formData.append("tglSelesai", tglSelesaiAgenda);
    formData.append("waktuPelaksanaan", waktuAgenda);
    formData.append("lokasiNama", lokasiAgenda);
    formData.append("lokasiId", lokasiAgendaId);
    if (titikAgenda) {
      formData.append("lat", String(titikAgenda.lat));
      formData.append("lng", String(titikAgenda.lng));
      formData.append("radiusM", String(radiusAgenda));
    }
    formData.append("targetPeserta", targetPeserta);

    startTransition(async () => {
      const res = await buatAgendaAction(null, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalAgendaBuka(false);
        resetFormAgenda();
      }
    });
  };

  const handleOpenEditAgenda = (item: AgendaItem) => {
    setAgendaDiedit(item);
    setJudulAgenda(item.judul);
    setJenisAgenda(item.jenis);
    setUrutanAgenda(item.urutan);
    setTglAgenda(keTanggalWib(item.tglPelaksanaan));
    setTglSelesaiAgenda(item.tglSelesai ? keTanggalWib(item.tglSelesai) : "");
    setWaktuAgenda(jamDariWaktuAgenda(item.waktuPelaksanaan));
    setLokasiAgenda(item.lokasiNama || "");
    setLokasiAgendaId(item.lokasiId ? String(item.lokasiId) : "");
    setRadiusAgenda(item.radiusM ?? 500);
    setTitikAgenda(
      item.lat !== null && item.lng !== null ? { lat: item.lat, lng: item.lng } : null
    );
    setTargetPeserta(item.targetPeserta);
    setModalEditAgendaBuka(true);
  };

  const handleSubmitEditAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaDiedit) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("judul", judulAgenda);
    formData.append("jenis", jenisAgenda);
    formData.append("urutan", urutanAgenda.toString());
    formData.append("tglPelaksanaan", tglAgenda);
    formData.append("tglSelesai", tglSelesaiAgenda);
    formData.append("waktuPelaksanaan", waktuAgenda);
    formData.append("lokasiNama", lokasiAgenda);
    formData.append("lokasiId", lokasiAgendaId);
    if (titikAgenda) {
      formData.append("lat", String(titikAgenda.lat));
      formData.append("lng", String(titikAgenda.lng));
      formData.append("radiusM", String(radiusAgenda));
    }
    formData.append("targetPeserta", targetPeserta);

    startTransition(async () => {
      const res = await ubahAgendaAction(agendaDiedit.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalEditAgendaBuka(false);
        resetFormAgenda();
      }
    });
  };

  const handleHapusAgenda = async (agendaId: number, judul: string) => {
    const setuju = await konfirmasiHapus({
      judul: "Hapus Agenda Kegiatan?",
      pesan: `Anda yakin ingin menghapus agenda "${judul}"? Sesi presensi dan rekap terkait akan terhapus.`,
      tombolHapus: "Ya, Hapus Agenda",
    });
    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusAgendaAction(agendaId);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
      }
    });
  };

  // Label Helper
  const getPeranBadge = (peran: PeranPanitia) => {
    switch (peran) {
      case PeranPanitia.ketua:
        return { label: "Ketua Pelaksana", bg: "bg-primary text-white border-primary" };
      case PeranPanitia.sekretaris:
        return { label: "Sekretaris", bg: "bg-secondary/10 text-secondary border-secondary/30" };
      case PeranPanitia.bendahara:
        return { label: "Bendahara", bg: "bg-highlight/15 text-[#B45309] border-highlight/40" };
      case PeranPanitia.pj_divisi:
        return { label: "PJ Divisi", bg: "bg-accent/20 text-primary border-accent/40" };
      default:
        return { label: "Anggota", bg: "bg-surface text-slate-muted border-[#E2E8F0]" };
    }
  };

  const getJenisAgendaBadge = (jenis: JenisAgenda) => {
    switch (jenis) {
      case JenisAgenda.rapat_pj:
        return { label: "Rapat PJ & PI", color: "text-primary bg-primary/10 border border-primary/20" };
      case JenisAgenda.rapat_besar:
        return { label: "Rapat Besar", color: "text-secondary bg-secondary/10 border border-secondary/20" };
      case JenisAgenda.rapat_koordinasi:
        return { label: "Rapat Koordinasi", color: "text-primary bg-accent/20 border border-accent/30" };
      case JenisAgenda.hari_h:
        return { label: "Hari H Pelaksanaan", color: "text-[#B45309] bg-highlight/20 border border-highlight/30" };
    }
  };

  const getTargetPesertaLabel = (target: TargetPeserta) => {
    switch (target) {
      case TargetPeserta.hanya_pj_pi:
        return "Khusus PJ & PI";
      case TargetPeserta.semua_panitia:
        return "Semua Panitia Proker";
      case TargetPeserta.semua_panitia_sto:
        return "Semua STO Satu Periode";
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          href="/dashboard/proker"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-navy mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-secondary" />
          Kembali ke Daftar Proker
        </Link>

        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  !isReadonly
                    ? "bg-accent/20 text-primary border border-accent/30"
                    : "bg-[#E2E8F0] text-slate-muted"
                }`}
              >
                {!isReadonly ? "Periode Aktif" : "Periode Selesai (Read-Only)"}
              </span>
              <span className="text-xs text-slate-muted">• {proker.periode.nama}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary">
              {proker.nama}
            </h2>
            <p className="text-xs text-slate-muted mt-1 max-w-2xl">
              {proker.deskripsi || "Tidak ada deskripsi rinci untuk proker ini."}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-navy border-t sm:border-t-0 sm:border-l border-[#E2E8F0] pt-3 sm:pt-0 sm:pl-6">
            <div>
              <div className="text-lg font-bold text-primary">
                {proker.kepanitiaan.length}
              </div>
              <div className="text-[11px] text-slate-muted">Total Panitia</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {proker.agenda.length}
              </div>
              <div className="text-[11px] text-slate-muted">Agenda Kegiatan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {pesan && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{pesan.teks}</div>
          <button
            onClick={() => setPesan(null)}
            className="text-slate-muted hover:text-navy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabAktif("panitia")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              tabAktif === "panitia"
                ? "border-secondary text-secondary"
                : "border-transparent text-slate-muted hover:text-navy"
            }`}
          >
            <Users className="w-4 h-4" />
            Susunan Kepanitiaan ({proker.kepanitiaan.length})
          </button>
          <button
            onClick={() => setTabAktif("agenda")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              tabAktif === "agenda"
                ? "border-secondary text-secondary"
                : "border-transparent text-slate-muted hover:text-navy"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Agenda Kegiatan ({proker.agenda.length})
          </button>
        </div>

        {!isReadonly && (
          <div>
            {tabAktif === "panitia" ? (
              <button
                onClick={() => {
                  setPilihanStoId("");
                  setPeranPanitia(PeranPanitia.anggota);
                  setDivisiPanitia("");
                  setModalPanitiaBuka(true);
                }}
                disabled={stoBelumMasuk.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Panitia
              </button>
            ) : (
              <button
                onClick={() => {
                  resetFormAgenda();
                  setModalAgendaBuka(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Agenda
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          TAB 1: KEPANITIAAN CONTENT
      ───────────────────────────────────────────── */}
      {tabAktif === "panitia" && (
        <div className="space-y-4">
          {proker.kepanitiaan.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white">
              <Users className="w-10 h-10 text-slate-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy">
                Belum ada susunan panitia untuk proker ini
              </p>
              <p className="text-xs text-slate-muted mt-1">
                Tambahkan pengurus STO ke dalam kepanitiaan melalui tombol &quot;Tambah Panitia&quot;.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto scrollbar-none" data-lenis-prevent>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-6 py-3.5">Nama & NIM Pengurus</th>
                      <th className="px-6 py-3.5">Peran Kepanitiaan</th>
                      <th className="px-6 py-3.5">Divisi Panitia</th>
                      <th className="px-6 py-3.5">Asal Divisi STO</th>
                      {!isReadonly && <th className="px-6 py-3.5 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {proker.kepanitiaan.map((item) => {
                      const badge = getPeranBadge(item.peran);
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-surface/70 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                {item.sto.nama.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-navy">
                                  {item.sto.nama}
                                </div>
                                <div className="text-[11px] text-slate-muted">
                                  {item.sto.nim} • {item.sto.emailGoogle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-navy">
                            {item.divisiPanitia || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-muted">
                            {item.sto.divisi || "Umum"}
                          </td>
                          {!isReadonly && (
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEditPanitia(item)}
                                  title="Ubah Peran Panitia"
                                  className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleHapusPanitia(item.id, item.sto.nama)}
                                  disabled={isPending}
                                  title="Hapus dari Panitia"
                                  className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          TAB 2: AGENDA KEGIATAN CONTENT
      ───────────────────────────────────────────── */}
      {tabAktif === "agenda" && (
        <div className="space-y-4">
          <AgendaStatusTabs
            items={[
              {
                id: "akan_datang",
                label: "Akan Datang",
                count: kelompokAgenda.akan_datang.length,
              },
              {
                id: "sedang_berlangsung",
                label: "Sedang Berlangsung",
                count: kelompokAgenda.sedang_berlangsung.length,
              },
              {
                id: "selesai",
                label: "Selesai",
                count: kelompokAgenda.selesai.length,
              },
            ]}
            value={tabEfektif}
            onChange={setTabStatus}
            layoutId="adsek-agenda-tabs"
          />

          {proker.agenda.length === 0 ? (
            <EmptyAgenda judul="Belum ada agenda untuk proker ini" deskripsi="Klik tombol &quot;Tambah Agenda&quot; untuk membuat jadwal rapat atau hari H kegiatan." />
          ) : agendaTerlihat.length === 0 ? (
            <EmptyAgenda />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={tabEfektif}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {agendaTerlihat.map((item) => {
                  const targetText = getTargetPesertaLabel(item.targetPeserta);
                  const sedangBerjalan = item.statusLive === "sedang_berlangsung";
                  const sudahSelesai = item.statusLive === "selesai";
                  const tglStr = formatTanggalIndo(new Date(item.tglPelaksanaan));
                  const tglSelesaiStr = item.tglSelesai
                    ? formatTanggalIndo(new Date(item.tglSelesai))
                    : null;
                  const jamAgendaWib = jamDariWaktuAgenda(item.waktuPelaksanaan);
                  const adaTitik = item.lat !== null && item.lng !== null;
                  const jenisBadge = getJenisAgendaBadge(item.jenis);

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${jenisBadge.color}`}>
                              {jenisBadge.label}
                            </span>
                            <span className="text-xs text-slate-muted">• {targetText}</span>
                            {sedangBerjalan ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Sedang berlangsung
                              </span>
                            ) : sudahSelesai ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E2E8F0] text-slate-muted">
                                Selesai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-highlight/15 text-[#8a6500]">
                                Belum mulai
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-primary tracking-tight">
                            {item.judul}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-muted">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-secondary" />
                              <span>
                                {tglStr}
                                {tglSelesaiStr && ` – ${tglSelesaiStr}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-secondary" />
                              <span>{jamAgendaWib} WIB</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-accent" />
                              <span>
                                {item.lokasiNama ?? "Lokasi belum diisi"}
                                {item.radiusM ? ` • radius ${item.radiusM} m` : ""}
                              </span>
                            </div>
                          </div>

                          {!adaTitik && (
                            <p className="text-[11px] text-amber-600 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Titik presensi belum diatur — atur di tombol edit agenda sebelum membuat sesi.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:self-start">
                          {!isReadonly && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditAgenda(item)}
                                title="Edit Agenda"
                                className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleHapusAgenda(item.id, item.judul)}
                                disabled={isPending}
                                title="Hapus Agenda"
                                className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {/* Aksi agenda: "Tambah Sesi" hanya saat sedang berlangsung.
                              Agenda akan datang tanpa sesi tidak menampilkan aksi apa pun. */}
                          {!isReadonly && sedangBerjalan && (
                            <button
                              onClick={() => setModalSesi({ agenda: item, sesiAwal: null })}
                              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-secondary hover:bg-primary text-white font-semibold text-xs shadow-md shadow-secondary/25 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah Sesi
                            </button>
                          )}
                          {isReadonly && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-[#E2E8F0] text-slate-muted text-xs font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Periode selesai
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sesi presensi: daftar hadir & QR muncul setelah sesi dibuat. */}
                      <div className="pt-3 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-secondary font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-accent" />
                            {item.sesi.length > 0
                              ? `${item.sesi.length} Sesi Presensi`
                              : "Belum ada sesi presensi"}
                          </span>
                        </div>

                        {item.sesi.length > 0 && (
                          <div className="rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] overflow-hidden">
                            {item.sesi.map((sesi) => {
                              const statusSesi = hitungStatusSesi(
                                new Date(sesi.bukaAt),
                                new Date(sesi.tutupAt),
                                now ?? undefined
                              );
                              const rekapSesi = rekap[sesi.id];
                              return (
                                <div
                                  key={sesi.id}
                                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-surface/50"
                                >
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-muted">
                                    <span className="inline-flex items-center gap-1 font-semibold text-navy">
                                      <QrCode className="w-3 h-3" />
                                      {keInputJam(sesi.bukaAt)}–{keInputJam(sesi.tutupAt)} WIB
                                    </span>
                                    <span>
                                      {statusSesi === "berjalan"
                                        ? "Sedang dibuka"
                                        : statusSesi === "belum_dibuka"
                                          ? "Belum dibuka"
                                          : "Sudah ditutup"}
                                    </span>
                                    {rekapSesi && (
                                      <span>
                                        Hadir{" "}
                                        {rekapSesi.ringkasan.hadir + rekapSesi.ringkasan.terlambat}/
                                        {rekapSesi.ringkasan.total}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {statusSesi === "berjalan" && (
                                      <Link
                                        href={`/dashboard/presensi/${sesi.id}`}
                                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-secondary hover:bg-primary text-white font-semibold text-[11px] shadow-sm transition-all"
                                      >
                                        <QrCode className="w-3 h-3" />
                                        Layar QR
                                      </Link>
                                    )}
                                    <Link
                                      href={`/dashboard/presensi/${sesi.id}`}
                                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-white border border-[#E2E8F0] hover:bg-surface text-navy font-medium text-[11px] transition-all"
                                    >
                                      <Users className="w-3 h-3" />
                                      Daftar Hadir
                                    </Link>
                                    {!isReadonly && !sudahSelesai && (
                                      <button
                                        onClick={() =>
                                          setModalSesi({
                                            agenda: item,
                                            sesiAwal: {
                                              id: sesi.id,
                                              bukaAt: new Date(sesi.bukaAt),
                                              tutupAt: new Date(sesi.tutupAt),
                                            },
                                          })
                                        }
                                        title="Ubah sesi"
                                        className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODAL TAMBAH PANITIA
      ───────────────────────────────────────────── */}
      {modalPanitiaBuka && (
        <Modal
          onClose={() => setModalPanitiaBuka(false)}
          ariaLabel="Tambah panitia ke proker"
          size="md"
        >
          <form
            onSubmit={handleSubmitTambahPanitia}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ModalHeader
              title="Tambah Panitia ke Proker"
              icon={Users}
              onClose={() => setModalPanitiaBuka(false)}
            />
            <ModalBody>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Pilih Pengurus STO
                    </label>
                    <select
                      required
                      value={pilihanStoId}
                      onChange={(e) => setPilihanStoId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    >
                      <option value="">-- Pilih Pengurus --</option>
                      {stoBelumMasuk.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.nim}) - {s.divisi || "Umum"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Peran Panitia
                    </label>
                    <select
                      value={peranPanitia}
                      onChange={(e) => setPeranPanitia(e.target.value as PeranPanitia)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    >
                      <optgroup label="Pimpinan Inti (PI)">
                        <option value={PeranPanitia.ketua}>Ketua Pelaksana</option>
                        <option value={PeranPanitia.sekretaris}>Sekretaris</option>
                        <option value={PeranPanitia.bendahara}>Bendahara</option>
                      </optgroup>
                      <optgroup label="Penanggung Jawab (PJ)">
                        <option value={PeranPanitia.pj_divisi}>PJ Divisi</option>
                      </optgroup>
                      <optgroup label="Anggota">
                        <option value={PeranPanitia.anggota}>Anggota Panitia</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Divisi Panitia (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Divisi Acara, Humas, Konsumsi"
                      value={divisiPanitia}
                      onChange={(e) => setDivisiPanitia(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>

            </ModalBody>
            <ModalFooter>
            <button
              type="button"
              onClick={() => setModalPanitiaBuka(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-secondary/25 transition-colors hover:bg-primary disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan Panitia
            </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────
          MODAL EDIT PANITIA
      ───────────────────────────────────────────── */}
      {modalEditPanitiaBuka && panitiaDiedit && (
        <Modal
          onClose={() => setModalEditPanitiaBuka(false)}
          ariaLabel="Ubah peran panitia"
          size="md"
        >
          <form
            onSubmit={handleSubmitEditPanitia}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ModalHeader
              title={`Ubah Peran Panitia (${panitiaDiedit.sto.nama})`}
              icon={Users}
              onClose={() => setModalEditPanitiaBuka(false)}
            />
            <ModalBody>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Peran Panitia
                    </label>
                    <select
                      value={peranPanitia}
                      onChange={(e) => setPeranPanitia(e.target.value as PeranPanitia)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    >
                      <optgroup label="Pimpinan Inti (PI)">
                        <option value={PeranPanitia.ketua}>Ketua Pelaksana</option>
                        <option value={PeranPanitia.sekretaris}>Sekretaris</option>
                        <option value={PeranPanitia.bendahara}>Bendahara</option>
                      </optgroup>
                      <optgroup label="Penanggung Jawab (PJ)">
                        <option value={PeranPanitia.pj_divisi}>PJ Divisi</option>
                      </optgroup>
                      <optgroup label="Anggota">
                        <option value={PeranPanitia.anggota}>Anggota Panitia</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Divisi Panitia (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Divisi Acara, Humas, Konsumsi"
                      value={divisiPanitia}
                      onChange={(e) => setDivisiPanitia(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>

            </ModalBody>
            <ModalFooter>
            <button
              type="button"
              onClick={() => setModalEditPanitiaBuka(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-secondary/25 transition-colors hover:bg-primary disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan Perubahan
            </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────
          MODAL TAMBAH / EDIT AGENDA (termasuk titik lokasi presensi)
      ───────────────────────────────────────────── */}
      {(modalAgendaBuka || modalEditAgendaBuka) && (
        <Modal
          onClose={() => {
                setModalAgendaBuka(false);
                setModalEditAgendaBuka(false);
                resetFormAgenda();
              }}
          ariaLabel={modalAgendaBuka ? "Tambah agenda" : "Edit agenda"}
          size="lg"
        >
          <form
            onSubmit={modalAgendaBuka ? handleSubmitTambahAgenda : handleSubmitEditAgenda}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ModalHeader
              title={modalAgendaBuka ? "Tambah Agenda Kegiatan Baru" : "Edit Agenda Kegiatan"}
              description="Titik presensi diatur di sini; semua sesi memakai titik yang sama."
              icon={Calendar}
              onClose={() => {
                setModalAgendaBuka(false);
                setModalEditAgendaBuka(false);
                resetFormAgenda();
              }}
            />
            <ModalBody>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Judul Agenda
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rapat Pleno 1 Persiapan Lomba"
                    value={judulAgenda}
                    onChange={(e) => setJudulAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Jenis Agenda
                    </label>
                    <select
                      value={jenisAgenda}
                      onChange={(e) => setJenisAgenda(e.target.value as JenisAgenda)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    >
                      <option value={JenisAgenda.rapat_pj}>Rapat PJ & PI</option>
                      <option value={JenisAgenda.rapat_besar}>Rapat Besar</option>
                      <option value={JenisAgenda.rapat_koordinasi}>Rapat Koordinasi</option>
                      <option value={JenisAgenda.hari_h}>Hari H Pelaksanaan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Urutan Agenda
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={urutanAgenda}
                      onChange={(e) => setUrutanAgenda(parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      required
                      value={tglAgenda}
                      onChange={(e) => setTglAgenda(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Tanggal Selesai (Opsional)
                    </label>
                    <input
                      type="date"
                      min={tglAgenda || undefined}
                      value={tglSelesaiAgenda}
                      onChange={(e) => setTglSelesaiAgenda(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-muted -mt-1">
                  Biarkan tanggal selesai kosong bila agenda hanya satu hari. Agenda multi-hari boleh
                  punya sesi presensi di tanggal mana pun di dalam rentang ini.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Jam Mulai Agenda (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={waktuAgenda}
                    onChange={(e) => setWaktuAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Target Peserta (Akses Presensi)
                  </label>
                  <select
                    value={targetPeserta}
                    onChange={(e) => setTargetPeserta(e.target.value as TargetPeserta)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
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
                  <p className="text-[10px] text-slate-muted mt-1">
                    Aturan akses ini menentukan siapa saja yang dapat melihat agenda ini di /home dan melakukan scan presensi.
                  </p>
                </div>

                <div className="pt-1 border-t border-[#E2E8F0] space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Lokasi Pertemuan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Ruang Sidang Utama Lt. 2 / Google Meet"
                      value={lokasiAgenda}
                      onChange={(e) => setLokasiAgenda(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1">
                        Titik dari Master Lokasi
                      </label>
                      <select
                        value={lokasiAgendaId}
                        onChange={(e) => pilihLokasiMaster(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
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
                      <label className="block text-xs font-semibold text-navy mb-1">
                        Radius Presensi (m)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        value={radiusAgenda}
                        onChange={(e) => setRadiusAgenda(parseInt(e.target.value) || 500)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E2E8F0] p-3 bg-surface/60">
                    <p className="text-[10px] text-slate-muted mb-2">
                      Titik presensi melekat pada agenda (bukan sesi). Semua sesi agenda ini memakai
                      titik &amp; radius yang sama.
                    </p>
                    <PetaPilihLokasi
                      lat={titikAgendaAktif.lat}
                      lng={titikAgendaAktif.lng}
                      radiusM={radiusAgenda}
                      tinggi="220px"
                      onPilih={(lat, lng) => setTitikAgenda({ lat, lng })}
                    />
                  </div>
                </div>

            </ModalBody>
            <ModalFooter>
            <button
              type="button"
              onClick={() => {
                setModalAgendaBuka(false);
                setModalEditAgendaBuka(false);
                resetFormAgenda();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-secondary/25 transition-colors hover:bg-primary disabled:opacity-60"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan Agenda
            </button>
            </ModalFooter>
          </form>
        </Modal>
      )}


      {/* MODAL SESI PRESENSI (buat/ubah) */}
      {modalSesi && (
        <SesiModal
          agendaId={modalSesi.agenda.id}
          judulAgenda={modalSesi.agenda.judul}
          tglMulai={keTanggalWib(modalSesi.agenda.tglPelaksanaan)}
          tglSelesai={
            modalSesi.agenda.tglSelesai ? keTanggalWib(modalSesi.agenda.tglSelesai) : null
          }
          jamAgendaWib={jamDariWaktuAgenda(modalSesi.agenda.waktuPelaksanaan)}
          lokasiNama={modalSesi.agenda.lokasiNama}
          radiusM={modalSesi.agenda.radiusM}
          sesiAwal={modalSesi.sesiAwal}
          onTutup={() => setModalSesi(null)}
        />
      )}
    </div>
  );
}
