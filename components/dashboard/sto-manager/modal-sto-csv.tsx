// components/dashboard/sto-manager/modal-sto-csv.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileSpreadsheet,
  X,
  Download,
  Upload,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { CsvBarisSto } from "@/lib/actions/sto";

interface Props {
  isOpen: boolean;
  isPending: boolean;
  csvFileName: string;
  csvPreview: CsvBarisSto[];
  csvHasil: {
    totalBerhasil: number;
    totalGagal: number;
    pesanGagal: string[];
  } | null;
  onClose: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProsesImpor: () => void;
  onDownloadTemplate: () => void;
}

export function ModalStoCsv({
  isOpen,
  isPending,
  csvFileName,
  csvPreview,
  csvHasil,
  onClose,
  onFileChange,
  onProsesImpor,
  onDownloadTemplate,
}: Props) {
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
            className="relative w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-secondary" />
                <h3 className="text-sm font-bold text-primary">
                  Impor Pengurus STO dari CSV
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-slate-muted hover:text-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Petunjuk & Download Template */}
              <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-primary">Format Kolom CSV:</p>
                  <p className="text-secondary text-[11px] mt-0.5">
                    Nama, NIM, Email, Jabatan, Divisi
                  </p>
                </div>
                <button
                  onClick={onDownloadTemplate}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-secondary border border-secondary/30 font-semibold text-[11px] shadow-sm hover:bg-surface cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template CSV
                </button>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center hover:border-secondary transition-colors">
                <Upload className="w-8 h-8 text-slate-muted mx-auto mb-2" />
                <p className="text-xs font-semibold text-navy">
                  Pilih file CSV dari komputer Anda
                </p>
                <p className="text-[11px] text-slate-muted mt-0.5">
                  Mendukung pemisah koma (,) atau titik koma (;)
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={onFileChange}
                  className="mt-3 block w-full text-xs text-slate-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 cursor-pointer"
                />
              </div>

              {/* Hasil Ringkasan Impor */}
              {csvHasil && (
                <div className="p-4 rounded-xl bg-surface border border-[#E2E8F0] text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-navy">Laporan Impor:</span>
                  </div>
                  <p className="text-slate-muted">
                    • Berhasil disimpan:{" "}
                    <strong className="text-emerald-600">
                      {csvHasil.totalBerhasil} data
                    </strong>
                  </p>
                  {csvHasil.totalGagal > 0 && (
                    <div className="space-y-1">
                      <p className="text-rose-600 font-semibold">
                        • Dilewati / Gagal: {csvHasil.totalGagal} data
                      </p>
                      <ul className="list-disc pl-5 text-[11px] text-rose-500 space-y-0.5 max-h-28 overflow-y-auto">
                        {csvHasil.pesanGagal.map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Baris CSV */}
              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy">
                      Preview Data ({csvPreview.length} baris ditemukan di{" "}
                      {csvFileName}):
                    </span>
                  </div>
                  <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto max-h-48 text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-surface sticky top-0 font-semibold text-slate-muted">
                        <tr>
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2">NIM</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Jabatan</th>
                          <th className="px-3 py-2">Divisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {csvPreview.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-medium text-navy">
                              {row.nama}
                            </td>
                            <td className="px-3 py-1.5 text-slate-muted">
                              {row.nim}
                            </td>
                            <td className="px-3 py-1.5 text-slate-muted">
                              {row.email}
                            </td>
                            <td className="px-3 py-1.5 text-navy">
                              {row.jabatan || "-"}
                            </td>
                            <td className="px-3 py-1.5 text-navy">
                              {row.divisi || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.length > 10 && (
                    <p className="text-[10px] text-slate-muted italic">
                      + {csvPreview.length - 10} baris lainnya akan diproses...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2 bg-surface">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-white hover:text-navy cursor-pointer"
              >
                Tutup
              </button>
              {csvPreview.length > 0 && !csvHasil && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={onProsesImpor}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Mulai Impor ({csvPreview.length} Data)
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
