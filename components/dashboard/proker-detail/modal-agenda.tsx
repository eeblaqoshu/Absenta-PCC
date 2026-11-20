// components/dashboard/proker-detail/modal-agenda.tsx
"use client";

import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { Calendar, Loader2 } from "lucide-react";
import { JenisAgenda, TargetPeserta } from "@prisma/client";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import type { LokasiOption } from "@/components/dashboard/sesi-modal";

interface Props {
  isOpen: boolean;
  isEdit: boolean;
  isPending: boolean;
  judulAgenda: string;
  jenisAgenda: JenisAgenda;
  tglAgenda: string;
  tglSelesaiAgenda: string;
  waktuAgenda: string;
  targetPeserta: TargetPeserta;
  lokasiAgenda: string;
  lokasiAgendaId: string;
  radiusAgenda: number;
  titikAgendaAktif: { lat: number; lng: number };
  daftarLokasi: LokasiOption[];
  setJudulAgenda: (v: string) => void;
  setJenisAgenda: (v: JenisAgenda) => void;
  setTglAgenda: (v: string) => void;
  setTglSelesaiAgenda: (v: string) => void;
  setWaktuAgenda: (v: string) => void;
  setTargetPeserta: (v: TargetPeserta) => void;
  setLokasiAgenda: (v: string) => void;
  setRadiusAgenda: (v: number) => void;
  setTitikAgenda: (v: { lat: number; lng: number } | null) => void;
  pilihLokasiMaster: (idStr: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalAgenda({
  isOpen,
  isEdit,
  isPending,
  judulAgenda,
  jenisAgenda,
  tglAgenda,
  tglSelesaiAgenda,
  waktuAgenda,
  targetPeserta,
  lokasiAgenda,
  lokasiAgendaId,
  radiusAgenda,
  titikAgendaAktif,
  daftarLokasi,
  setJudulAgenda,
  setJenisAgenda,
  setTglAgenda,
  setTglSelesaiAgenda,
  setWaktuAgenda,
  setTargetPeserta,
  setLokasiAgenda,
  setRadiusAgenda,
  setTitikAgenda,
  pilihLokasiMaster,
  onClose,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  return (
    <Modal
      onClose={onClose}
      ariaLabel={isEdit ? "Edit agenda" : "Tambah agenda"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalHeader
          title={
            isEdit ? "Edit Agenda Kegiatan" : "Tambah Agenda Kegiatan Baru"
          }
          description="Titik presensi diatur di sini; semua sesi memakai titik yang sama."
          icon={Calendar}
          onClose={onClose}
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
              <option value={JenisAgenda.rapat_koordinasi}>
                Rapat Koordinasi
              </option>
              <option value={JenisAgenda.hari_h}>Hari H Pelaksanaan</option>
            </select>
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
            Biarkan tanggal selesai kosong bila agenda hanya satu hari. Agenda
            multi-hari boleh punya sesi presensi di tanggal mana pun di dalam
            rentang ini.
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
              onChange={(e) =>
                setTargetPeserta(e.target.value as TargetPeserta)
              }
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
              Aturan akses ini menentukan siapa saja yang dapat melihat agenda
              ini di /home dan melakukan scan presensi.
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
                  onChange={(e) =>
                    setRadiusAgenda(parseInt(e.target.value) || 500)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] p-3 bg-surface/60">
              <p className="text-[10px] text-slate-muted mb-2">
                Titik presensi melekat pada agenda (bukan sesi). Semua sesi
                agenda ini memakai titik &amp; radius yang sama.
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
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer transition-all"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan Agenda
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
