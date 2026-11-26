// components/dashboard/proker-list.tsx
"use client";

import { useState, useTransition } from "react";
import {
  buatProkerAction,
  ubahProkerAction,
  hapusProkerAction,
} from "@/lib/actions/proker";
import { motion, AnimatePresence } from "framer-motion";
import { konfirmasiHapus } from "@/lib/swal";
import {
  FolderKanban,
  Plus,
  ArrowRight,
  Edit2,
  Trash2,
  Users,
  Calendar,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface ProkerItem {
  id: number;
  nama: string;
  kategori: "proker" | "agenda";
  deskripsi: string | null;
  pembuat: {
    nama: string;
    role: string;
  };
  _count: {
    kepanitiaan: number;
    agenda: number;
  };
}

export function ProkerList({
  initialProker,
  namaPeriode,
  isPeriodeAktif,
}: {
  initialProker: ProkerItem[];
  namaPeriode: string;
  isPeriodeAktif: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  // Filter
  const [filterKategori, setFilterKategori] = useState<
    "semua" | "proker" | "agenda"
  >("semua");

  // Modals
  const [modalBuka, setModalBuka] = useState(false);
  const [prokerDiedit, setProkerDiedit] = useState<ProkerItem | null>(null);

  // Form
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState<"proker" | "agenda">("proker");
  const [deskripsi, setDeskripsi] = useState("");

  const resetForm = () => {
    setNama("");
    setKategori("proker");
    setDeskripsi("");
    setProkerDiedit(null);
  };

  const handleOpenEdit = (item: ProkerItem) => {
    setProkerDiedit(item);
    setNama(item.nama);
    setKategori(item.kategori || "proker");
    setDeskripsi(item.deskripsi || "");
    setModalBuka(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
    formData.append("nama", nama);
    formData.append("kategori", kategori);
    formData.append("deskripsi", deskripsi);

    startTransition(async () => {
      let res;
      if (prokerDiedit) {
        res = await ubahProkerAction(prokerDiedit.id, formData);
      } else {
        res = await buatProkerAction(null, formData);
      }

      if (res?.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else if (res?.sukses) {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalBuka(false);
        resetForm();
      }
    });
  };

  const handleHapusProker = async (
    id: number,
    namaProker: string,
    kat?: "proker" | "agenda",
  ) => {
    const label = kat === "agenda" ? "Agenda" : "Program Kerja";
    const setuju = await konfirmasiHapus({
      judul: `Hapus ${label}?`,
      pesan: `Yakin ingin menghapus ${label.toLowerCase()} "${namaProker}"? Semua susunan panitia dan agenda di dalamnya akan ikut terhapus.`,
      tombolHapus: `Ya, Hapus ${label}`,
    });
    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusProkerAction(id);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
      }
    });
  };

  const prokerTerfilter = initialProker.filter((item) => {
    if (filterKategori === "semua") return true;
    return (item.kategori || "proker") === filterKategori;
  });

  const jumlahProker = initialProker.filter(
    (item) => (item.kategori || "proker") === "proker",
  ).length;
  const jumlahAgenda = initialProker.filter(
    (item) => item.kategori === "agenda",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isPeriodeAktif ? "bg-accent animate-pulse" : "bg-slate-400"
                }`}
              />
              <span className="text-xs font-semibold whitespace-nowrap text-secondary">
                {namaPeriode}
              </span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            Program Kerja dan Agenda
          </h2>
          <p className="text-xs text-slate-muted mt-1 leading-relaxed">
            Kelola seluruh program kerja organisasi, susunan panitia
            (PI/PJ/Anggota), dan agenda kegiatan.
          </p>
        </div>

        {isPeriodeAktif && (
          <button
            onClick={() => {
              resetForm();
              setModalBuka(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Buat Baru
          </button>
        )}
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

      {/* Filter Kategori Tab */}
      {initialProker.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterKategori("semua")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterKategori === "semua"
                ? "bg-secondary text-white shadow-xs"
                : "bg-white border border-[#E2E8F0] text-slate-muted hover:text-navy hover:bg-surface"
            }`}
          >
            Semua
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filterKategori === "semua"
                  ? "bg-white/20 text-white"
                  : "bg-surface text-slate-muted"
              }`}
            >
              {initialProker.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterKategori("proker")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterKategori === "proker"
                ? "bg-secondary text-white shadow-xs"
                : "bg-white border border-[#E2E8F0] text-slate-muted hover:text-navy hover:bg-surface"
            }`}
          >
            Program Kerja
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filterKategori === "proker"
                  ? "bg-white/20 text-white"
                  : "bg-surface text-slate-muted"
              }`}
            >
              {jumlahProker}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterKategori("agenda")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterKategori === "agenda"
                ? "bg-secondary text-white shadow-xs"
                : "bg-white border border-[#E2E8F0] text-slate-muted hover:text-navy hover:bg-surface"
            }`}
          >
            Agenda
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filterKategori === "agenda"
                  ? "bg-white/20 text-white"
                  : "bg-surface text-slate-muted"
              }`}
            >
              {jumlahAgenda}
            </span>
          </button>
        </div>
      )}

      {/* Grid of Prokers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialProker.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white">
            <FolderKanban className="w-10 h-10 text-slate-muted mx-auto mb-3" />
            <p className="text-sm font-semibold text-navy">
              Belum ada program kerja atau agenda di periode ini
            </p>
            <p className="text-xs text-slate-muted mt-1">
              {isPeriodeAktif
                ? 'Klik tombol "Buat Baru" untuk menambahkan kegiatan.'
                : "Periode ini sudah selesai dan tidak memiliki data kegiatan."}
            </p>
          </div>
        ) : prokerTerfilter.length === 0 ? (
          <div className="col-span-full p-10 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white">
            <p className="text-xs text-slate-muted">
              Tidak ada{" "}
              {filterKategori === "agenda" ? "agenda" : "program kerja"} pada
              filter ini.
            </p>
          </div>
        ) : (
          prokerTerfilter.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.kategori === "agenda"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-secondary/10 text-secondary border border-secondary/20"
                        }`}
                      >
                        {item.kategori === "agenda"
                          ? "Agenda"
                          : "Program Kerja"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-primary line-clamp-1 group-hover:text-secondary transition-colors">
                      {item.nama}
                    </h3>
                  </div>
                  {isPeriodeAktif && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        title={
                          item.kategori === "agenda"
                            ? "Edit Agenda"
                            : "Edit Proker"
                        }
                        className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          handleHapusProker(item.id, item.nama, item.kategori)
                        }
                        disabled={isPending}
                        title={
                          item.kategori === "agenda"
                            ? "Hapus Agenda"
                            : "Hapus Proker"
                        }
                        className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-muted line-clamp-2 min-h-[2rem]">
                  {item.deskripsi || "Tidak ada deskripsi tambahan."}
                </p>

                {/* Badge Stats Panitia & Agenda */}
                <div className="flex flex-wrap items-center gap-2 mt-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-[#E2E8F0] text-navy font-semibold text-[11px]">
                    <Users className="w-3.5 h-3.5 text-secondary" />
                    <span>{item._count.kepanitiaan} Panitia</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface border border-[#E2E8F0] text-navy font-semibold text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>{item._count.agenda} Kegiatan</span>
                  </span>
                </div>

                {/* Info pembuat */}
                <p className="text-[11px] text-slate-muted mt-2.5">
                  Dibuat oleh:{" "}
                  <span className="font-medium text-navy">
                    {item.pembuat.nama}
                  </span>
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                <Link
                  href={`/dashboard/proker/${item.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-surface hover:bg-secondary hover:text-white text-navy text-xs font-semibold transition-all group/btn"
                >
                  Kelola Panitia & Kegiatan
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Tambah / Edit Proker */}
      <AnimatePresence>
        {modalBuka && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setModalBuka(false);
                resetForm();
              }}
              className="fixed inset-0 bg-navy/50 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary">
                  {prokerDiedit
                    ? `Edit ${kategori === "agenda" ? "Agenda" : "Program Kerja"}`
                    : `Buat ${kategori === "agenda" ? "Agenda" : "Program Kerja"} Baru`}
                </h3>
                <button
                  onClick={() => {
                    setModalBuka(false);
                    resetForm();
                  }}
                  className="text-slate-muted hover:text-navy cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Opsi Pilihan Tipe: Program Kerja vs Agenda */}
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1.5">
                    Tipe Kegiatan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKategori("proker")}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        kategori === "proker"
                          ? "bg-secondary/10 border-secondary text-secondary shadow-xs"
                          : "bg-surface border-[#CBD5E1] text-slate-muted hover:text-navy hover:bg-white"
                      }`}
                    >
                      <FolderKanban className="w-4 h-4" />
                      <span>Program Kerja</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKategori("agenda")}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        kategori === "agenda"
                          ? "bg-secondary/10 border-secondary text-secondary shadow-xs"
                          : "bg-surface border-[#CBD5E1] text-slate-muted hover:text-navy hover:bg-white"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Agenda</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    {kategori === "agenda"
                      ? "Nama Agenda"
                      : "Nama Program Kerja"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      kategori === "agenda"
                        ? "Contoh: Makrab Pengurus 2026 / Rapat Pleno"
                        : "Contoh: PCC National IT Festival 2026"
                    }
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Deskripsi Kegiatan (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      kategori === "agenda"
                        ? "Jelaskan ringkas mengenai agenda ini..."
                        : "Jelaskan ringkas mengenai tujuan dan konsep proker ini..."
                    }
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalBuka(false);
                      resetForm();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer"
                  >
                    {isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {prokerDiedit
                      ? "Simpan Perubahan"
                      : kategori === "agenda"
                        ? "Buat Agenda"
                        : "Buat Proker"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
