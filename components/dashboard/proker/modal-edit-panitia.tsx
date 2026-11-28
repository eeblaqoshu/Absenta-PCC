// components/dashboard/proker-detail/modal-edit-panitia.tsx
"use client";

import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Loader2, AlertCircle } from "lucide-react";
import {
  DAFTAR_SARAN_PERAN,
  isDivisiLitbang,
  isPeranLitbangPengawas,
  isSekretarisUmum,
  isJabatanAdminOrSekum,
  getKategoriJabatanPi,
  validasiKesesuaianJabatanPi,
  type PanitiaItem,
  type StoOption,
} from "./types";
import type { KategoriProker } from "@prisma/client";

interface Props {
  isOpen: boolean;
  panitiaDiedit: PanitiaItem | null;
  kategori?: KategoriProker | "proker" | "agenda" | null;
  availableStos: StoOption[];
  existingPanitiaStoIds: Set<number>;
  selectedStoIdEdit: number;
  selectedRoleKeyEdit: string;
  divisiPanitiaEdit: string;
  isPending: boolean;
  setSelectedStoIdEdit: (v: number) => void;
  setSelectedRoleKeyEdit: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalEditPanitia({
  isOpen,
  panitiaDiedit,
  kategori,
  availableStos,
  existingPanitiaStoIds,
  selectedStoIdEdit,
  selectedRoleKeyEdit,
  divisiPanitiaEdit,
  isPending,
  setSelectedStoIdEdit,
  setSelectedRoleKeyEdit,
  onClose,
  onSubmit,
}: Props) {
  if (!isOpen || !panitiaDiedit) return null;

  const stoTerpilih =
    availableStos.find((s) => s.id === selectedStoIdEdit) || panitiaDiedit.sto;
  const isLitbang = isDivisiLitbang(stoTerpilih);
  const laranganAdsek = isJabatanAdminOrSekum(stoTerpilih);
  const pi = getKategoriJabatanPi(stoTerpilih);
  const validasiPiEdit = validasiKesesuaianJabatanPi(
    stoTerpilih,
    selectedRoleKeyEdit,
    divisiPanitiaEdit,
  );

  return (
    <Modal onClose={onClose} ariaLabel="Ubah Panitia" size="md">
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalHeader
          title="Ubah Anggota & Peran Panitia"
          description={`Sesuaikan pengurus STO atau peran kepanitiaan pada ${kategori === "agenda" ? "agenda" : "program kerja"} ini.`}
          onClose={onClose}
        />
        <ModalBody>
          <div className="space-y-4">
            {/* Pilihan Pengurus STO */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Pengurus STO
              </label>
              <select
                value={selectedStoIdEdit}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setSelectedStoIdEdit(newId);
                  const found = availableStos.find((s) => s.id === newId);
                  if (found && isDivisiLitbang(found)) {
                    setSelectedRoleKeyEdit("Litbang Pengawas");
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              >
                {/* STO saat ini */}
                <option value={panitiaDiedit.sto.id}>
                  {panitiaDiedit.sto.nama} (Saat ini)
                </option>

                {/* STO lain yang belum masuk dalam kepanitiaan proker ini */}
                {availableStos
                  .filter((s) => {
                    // Sembunyikan Admin & Sekum
                    if (isJabatanAdminOrSekum(s).dilarang) return false;

                    // Sembunyikan yang tidak cocok dengan selectedRoleKeyEdit
                    if (selectedRoleKeyEdit.trim()) {
                      if (
                        !validasiKesesuaianJabatanPi(
                          s,
                          selectedRoleKeyEdit,
                          divisiPanitiaEdit,
                        ).valid
                      ) {
                        return false;
                      }
                      if (
                        isDivisiLitbang(s) &&
                        !isPeranLitbangPengawas(
                          selectedRoleKeyEdit,
                          selectedRoleKeyEdit,
                        )
                      ) {
                        return false;
                      }
                    }

                    return (
                      s.id !== panitiaDiedit.sto.id &&
                      !existingPanitiaStoIds.has(s.id)
                    );
                  })
                  .map((sto) => (
                    <option key={sto.id} value={sto.id}>
                      {sto.nama}
                    </option>
                  ))}
              </select>
            </div>

            {/* Peringatan Divisi Litbang */}
            {isLitbang && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Pengurus Divisi Litbang:</span>{" "}
                  Sesuai kebijakan organisasi, pengurus dari Divisi Litbang
                  hanya dapat ditugaskan sebagai{" "}
                  <strong>Litbang Pengawas</strong> pada seluruh program kerja.
                </div>
              </div>
            )}

            {/* Peringatan Larangan Masuk Kepanitiaan (Admin & Sekum) */}
            {laranganAdsek.dilarang ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <span className="font-bold">Dilarang Masuk Kepanitiaan:</span>{" "}
                  {laranganAdsek.pesanError}
                </div>
              </div>
            ) : (
              <>
                {/* Info Pengurus Inti */}
                {pi && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Pengurus Inti ({pi.namaJabatan}):</span>{" "}
                      Sesuai struktur organisasi, pengurus dengan jabatan {pi.namaJabatan} hanya dapat ditugaskan dengan peran <strong>{pi.labelPeranWajib}</strong>.
                    </div>
                  </div>
                )}

                {/* Peringatan Ketidaksesuaian Peran PI */}
                {!validasiPiEdit.valid && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Peran Tidak Sesuai:</span> {validasiPiEdit.pesanError}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Pilihan Peran / Posisi Panitia */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Peran / Posisi Panitia
              </label>
              <input
                type="text"
                list="daftar-saran-peran-edit"
                value={selectedRoleKeyEdit}
                onChange={(e) => setSelectedRoleKeyEdit(e.target.value)}
                placeholder="Ketik peran, cth: Ketua Pelaksana / Sie Acara"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              />
              <datalist id="daftar-saran-peran-edit">
                {DAFTAR_SARAN_PERAN.map((saran) => (
                  <option key={saran} value={saran} />
                ))}
              </datalist>
            </div>

            {/* Divisi Asal Pengurus */}
            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Divisi Asal STO
              </label>
              <input
                type="text"
                readOnly
                value={stoTerpilih.divisi || "Umum"}
                placeholder="Divisi pengurus"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-navy focus:outline-none cursor-default"
              />
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
            disabled={isPending || !validasiPiEdit.valid}
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
