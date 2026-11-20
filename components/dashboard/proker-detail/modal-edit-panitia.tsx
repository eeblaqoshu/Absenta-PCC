// components/dashboard/proker-detail/modal-edit-panitia.tsx
"use client";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { OPSI_PERAN_PANITIA, isDivisiLitbang, type PanitiaItem } from "./types";

interface Props {
  isOpen: boolean;
  panitiaDiedit: PanitiaItem | null;
  selectedRoleKeyEdit: string;
  divisiPanitiaEdit: string;
  isPending: boolean;
  setSelectedRoleKeyEdit: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalEditPanitia({
  isOpen,
  panitiaDiedit,
  selectedRoleKeyEdit,
  divisiPanitiaEdit,
  isPending,
  setSelectedRoleKeyEdit,
  onClose,
  onSubmit,
}: Props) {
  if (!isOpen || !panitiaDiedit) return null;

  return (
    <Modal onClose={onClose} ariaLabel="Ubah Peran Panitia" size="md">
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalHeader
          title="Ubah Peran Panitia"
          description={`Pengurus: ${panitiaDiedit.sto.nama}`}
          icon={Users}
          onClose={onClose}
        />
        <ModalBody>
          <div className="space-y-4">
            {isDivisiLitbang(panitiaDiedit.sto) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Pengurus Divisi Litbang:</span>{" "}
                  Sesuai kebijakan organisasi, pengurus dari Divisi Litbang hanya dapat ditugaskan sebagai <strong>Litbang Pengawas</strong> pada seluruh program kerja.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Peran / Posisi Panitia Baru
              </label>
              <select
                value={selectedRoleKeyEdit}
                onChange={(e) => setSelectedRoleKeyEdit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              >
                <optgroup label="Pimpinan Inti (PI)">
                  {OPSI_PERAN_PANITIA.filter((o) =>
                    o.kategori.includes("PI"),
                  ).map((opsi) => (
                    <option
                      key={opsi.key}
                      value={opsi.key}
                      disabled={isDivisiLitbang(panitiaDiedit.sto)}
                    >
                      {opsi.label}
                      {isDivisiLitbang(panitiaDiedit.sto)
                        ? " (Tidak diizinkan untuk Litbang)"
                        : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Penanggung Jawab (PJ) & Pengawas">
                  {OPSI_PERAN_PANITIA.filter((o) =>
                    o.kategori.includes("PJ"),
                  ).map((opsi) => {
                    const isDisabled =
                      isDivisiLitbang(panitiaDiedit.sto) &&
                      opsi.key !== "litbang_pengawas";
                    return (
                      <option
                        key={opsi.key}
                        value={opsi.key}
                        disabled={isDisabled}
                      >
                        {opsi.label}
                        {isDisabled ? " (Tidak diizinkan untuk Litbang)" : ""}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Anggota Panitia">
                  {OPSI_PERAN_PANITIA.filter((o) =>
                    o.kategori.includes("Anggota"),
                  ).map((opsi) => (
                    <option
                      key={opsi.key}
                      value={opsi.key}
                      disabled={isDivisiLitbang(panitiaDiedit.sto)}
                    >
                      {opsi.label}
                      {isDivisiLitbang(panitiaDiedit.sto)
                        ? " (Tidak diizinkan untuk Litbang)"
                        : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Divisi / Departemen
              </label>
              <input
                type="text"
                readOnly
                value={divisiPanitiaEdit}
                placeholder="Divisi pengurus"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-navy focus:outline-none cursor-default"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Nama Pengurus STO
              </label>
              <div className="p-3.5 rounded-xl bg-surface border border-[#E2E8F0] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                  {panitiaDiedit.sto.nama.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-navy truncate">
                    {panitiaDiedit.sto.nama}
                  </p>
                  <p className="text-[10px] text-slate-muted truncate">
                    {panitiaDiedit.sto.nim} • {panitiaDiedit.sto.emailGoogle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
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
            Simpan Perubahan
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
