// components/dashboard/sto-manager/modal-sto-form.tsx
"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Upload, Trash2, PenTool } from "lucide-react";
import type { StoItem } from "./types";

interface Props {
  isOpen: boolean;
  isEdit: boolean;
  isPending: boolean;
  stoSedangDiedit: StoItem | null;
  nama: string;
  nim: string;
  emailGoogle: string;
  jabatan: string;
  divisi: string;
  ttd: string | null;
  setNama: (v: string) => void;
  setNim: (v: string) => void;
  setEmailGoogle: (v: string) => void;
  setJabatan: (v: string) => void;
  setDivisi: (v: string) => void;
  setTtd: (v: string | null) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Menyesuaikan format gambar tanda tangan ke rasio standar tanda tangan ukuran (320x120 px):
 * 1. Menghapus latar putih/terang agar transparan.
 * 2. Memangkas ruang kosong di sekeliling goresan tanda tangan (auto-trim).
 * 3. Menempatkan tanda tangan tepat di tengah kanvas proporsional 320x120 px.
 */
async function prosesGambarTtd(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Gagal membaca file SVG"));
      reader.readAsDataURL(file);
    });
  }

  const dataUrlAwal = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Format gambar tidak dapat dimuat"));
    el.src = dataUrlAwal;
  });

  // Tahap 1: Render ke kanvas kerja (maks 800px) untuk hapus background & cari batas tinta
  const MAKS_KERJA = 800;
  const skalaKerja = Math.min(1, MAKS_KERJA / Math.max(img.width, img.height));
  const lebarKerja = Math.max(1, Math.round(img.width * skalaKerja));
  const tinggiKerja = Math.max(1, Math.round(img.height * skalaKerja));

  const workCanvas = document.createElement("canvas");
  workCanvas.width = lebarKerja;
  workCanvas.height = tinggiKerja;
  const workCtx = workCanvas.getContext("2d");
  if (!workCtx) return dataUrlAwal;

  workCtx.clearRect(0, 0, lebarKerja, tinggiKerja);
  workCtx.drawImage(img, 0, 0, lebarKerja, tinggiKerja);

  const imageData = workCtx.getImageData(0, 0, lebarKerja, tinggiKerja);
  const piksel = imageData.data;

  let minX = lebarKerja;
  let minY = tinggiKerja;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < tinggiKerja; y++) {
    for (let x = 0; x < lebarKerja; x++) {
      const i = (y * lebarKerja + x) * 4;
      const r = piksel[i];
      const g = piksel[i + 1];
      const b = piksel[i + 2];
      let a = piksel[i + 3];
      if (a === 0) continue;

      const kecerahanMin = Math.min(r, g, b);
      if (kecerahanMin >= 238) {
        a = 0;
        piksel[i + 3] = 0;
      } else if (kecerahanMin >= 210) {
        const faktor = (238 - kecerahanMin) / 28;
        a = Math.round(a * faktor);
        piksel[i + 3] = a;
      }

      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  workCtx.putImageData(imageData, 0, 0);

  // Tahap 2: Normalisasi ke kanvas standar tanda tangan (320 x 120 px)
  const TARGET_W = 320;
  const TARGET_H = 120;
  const PADDING = 10;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = TARGET_W;
  outCanvas.height = TARGET_H;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return workCanvas.toDataURL("image/png");

  outCtx.clearRect(0, 0, TARGET_W, TARGET_H);

  const cropX = maxX >= minX ? minX : 0;
  const cropY = maxY >= minY ? minY : 0;
  const cropW = maxX >= minX ? Math.max(1, maxX - minX + 1) : lebarKerja;
  const cropH = maxY >= minY ? Math.max(1, maxY - minY + 1) : tinggiKerja;

  const ruangW = TARGET_W - PADDING * 2;
  const ruangH = TARGET_H - PADDING * 2;
  const skalaFit = Math.min(ruangW / cropW, ruangH / cropH);
  const drawW = Math.max(1, Math.round(cropW * skalaFit));
  const drawH = Math.max(1, Math.round(cropH * skalaFit));
  const drawX = Math.round((TARGET_W - drawW) / 2);
  const drawY = Math.round((TARGET_H - drawH) / 2);

  outCtx.drawImage(
    workCanvas,
    cropX,
    cropY,
    cropW,
    cropH,
    drawX,
    drawY,
    drawW,
    drawH,
  );

  return outCanvas.toDataURL("image/png");
}

export function ModalStoForm({
  isOpen,
  isEdit,
  isPending,
  nama,
  nim,
  emailGoogle,
  jabatan,
  divisi,
  ttd,
  setNama,
  setNim,
  setEmailGoogle,
  setJabatan,
  setDivisi,
  setTtd,
  onClose,
  onSubmit,
}: Props) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [sedangMemprosesTtd, setSedangMemprosesTtd] = useState(false);
  const [errorTtd, setErrorTtd] = useState<string | null>(null);

  const ttdAktif = ttd && ttd !== "__HAPUS__" ? ttd : null;

  async function handlePilihFileTtd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorTtd("Ukuran file gambar maksimal 5 MB.");
      return;
    }

    setErrorTtd(null);
    setSedangMemprosesTtd(true);
    try {
      const hasilDataUrl = await prosesGambarTtd(file);
      setTtd(hasilDataUrl);
    } catch (err) {
      setErrorTtd(
        err instanceof Error
          ? err.message
          : "Gagal memproses gambar tanda tangan.",
      );
    } finally {
      setSedangMemprosesTtd(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-primary">
                {isEdit ? "Edit Pengurus STO" : "Tambah Pengurus STO"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-muted hover:text-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={onSubmit}
              className="p-6 space-y-4 overflow-y-auto scrollbar-none"
              data-lenis-prevent
            >
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Albi"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  NIM
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 3.34.23.0.12"
                  value={nim}
                  onChange={(e) => setNim(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Email Google (Mahasiswa)
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: albi@mhs.polines.ac.id"
                  value={emailGoogle}
                  onChange={(e) => setEmailGoogle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                />
                <p className="text-[10px] text-slate-muted mt-1">
                  Email ini digunakan STO untuk login via akun Google.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Staff Muda"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Divisi / Departemen
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Departemen Software"
                    value={divisi}
                    onChange={(e) => setDivisi(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
              </div>

              {/* Upload Source TTD Digital STO */}
              <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy">
                    <PenTool className="w-3.5 h-3.5 text-secondary" />
                    Tanda Tangan Digital (TTD)
                  </label>
                  <span className="text-[10px] text-slate-muted">
                    Rasio TTD Otomatis (PNG/JPG/SVG)
                  </span>
                </div>

                <input
                  ref={inputFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handlePilihFileTtd}
                  className="hidden"
                />

                {ttdAktif ? (
                  <div className="rounded-xl border border-[#CBD5E1] bg-surface p-3 space-y-2.5">
                    <div
                      role="img"
                      aria-label={`Pratinjau TTD ${nama || "STO"}`}
                      className="h-24 w-full max-w-[240px] mx-auto p-2 rounded-lg bg-white border border-[#E2E8F0] overflow-hidden"
                    >
                      <div
                        className="w-full h-full bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url("${ttdAktif}")` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => inputFileRef.current?.click()}
                        disabled={sedangMemprosesTtd}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[11px] font-semibold text-navy hover:border-secondary hover:text-secondary transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Ganti TTD
                      </button>
                      <button
                        type="button"
                        onClick={() => setTtd("__HAPUS__")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-muted hover:text-primary hover:bg-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus TTD
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputFileRef.current?.click()}
                    disabled={sedangMemprosesTtd}
                    className="w-full py-4 px-3 rounded-xl border border-dashed border-[#CBD5E1] bg-surface/60 hover:bg-surface hover:border-secondary transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer"
                  >
                    {sedangMemprosesTtd ? (
                      <Loader2 className="w-4 h-4 text-secondary animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-secondary" />
                    )}
                    <span className="text-xs font-semibold text-primary">
                      {sedangMemprosesTtd
                        ? "Memproses tanda tangan..."
                        : "Pilih File Gambar TTD"}
                    </span>
                    <span className="text-[10px] text-slate-muted">
                      Otomatis disesuaikan ke bentuk tanda tangan &amp; latar
                      transparan
                    </span>
                  </button>
                )}

                {errorTtd && (
                  <p className="text-[11px] font-medium text-primary bg-highlight/20 px-2.5 py-1.5 rounded-lg">
                    {errorTtd}
                  </p>
                )}

                <p className="text-[10px] text-slate-muted leading-relaxed">
                  TTD ini otomatis tampil pada daftar hadir setiap kali STO
                  tercatat hadir atau terlambat.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || sedangMemprosesTtd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Simpan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
