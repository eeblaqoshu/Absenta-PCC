// components/dashboard/sto-manager/modal-sto-form.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
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
  setNama: (v: string) => void;
  setNim: (v: string) => void;
  setEmailGoogle: (v: string) => void;
  setJabatan: (v: string) => void;
  setDivisi: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
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
  setNama,
  setNim,
  setEmailGoogle,
  setJabatan,
  setDivisi,
  onClose,
  onSubmit,
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
            className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">
                {isEdit ? "Edit Pengurus STO" : "Tambah Pengurus STO"}
              </h3>
              <button
                onClick={onClose}
                className="text-slate-muted hover:text-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-4">
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
                    Divisi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Litbang"
                    value={divisi}
                    onChange={(e) => setDivisi(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
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
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
