// components/dashboard/proker-detail.tsx
"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  buatAgendaAction,
  ubahAgendaAction,
  hapusAgendaAction,
} from "@/lib/actions/agenda";
import { ubahPanitiaAction, hapusPanitiaAction } from "@/lib/actions/kepanitiaan";
import { JenisAgenda, TargetPeserta, StatusPeriode } from "@prisma/client";
import { konfirmasiHapus } from "@/lib/swal";
import {
  SesiModal,
  type LokasiOption,
  type SesiItem,
} from "@/components/dashboard/sesi-modal";
import {
  hitungStatusAgenda,
  jamDariWaktuAgenda,
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
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  OPSI_PERAN_PANITIA,
  DETAK_MS,
  langgananDetak,
  cuplikanDetak,
  keTanggalWib,
  type AgendaItem,
  type PanitiaItem,
  type StoOption,
  type ProkerData,
} from "./proker-detail/types";
import { PanitiaSection } from "./proker-detail/panitia-section";
import { AgendaSection } from "./proker-detail/agenda-section";
import { ModalKelolaPanitia } from "./proker-detail/modal-kelola-panitia";
import { ModalEditPanitia } from "./proker-detail/modal-edit-panitia";
import { ModalAgenda } from "./proker-detail/modal-agenda";

// Re-export untuk backwards-compatibility
export { OPSI_PERAN_PANITIA };
export type { PanitiaItem, AgendaItem, StoOption };

interface Props {
  proker: ProkerData;
  availableStos: StoOption[];
  daftarLokasi: LokasiOption[];
  rekap: Record<number, RekapKehadiranSesi>;
}

export function ProkerDetail({
  proker,
  availableStos,
  daftarLokasi,
  rekap,
}: Props) {
  const [tabAktif, setTabAktif] = useState<"panitia" | "agenda">("panitia");
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  const isReadonly = proker.periode.status === StatusPeriode.selesai;

  // Real-time time tick (no render loop)
  const [tabStatus, setTabStatus] = useState<StatusAgendaDihitung>("sedang_berlangsung");
  const detak = useSyncExternalStore(langgananDetak, cuplikanDetak, () => 0);
  const now = useMemo(
    () => (detak > 0 ? new Date(detak * DETAK_MS) : null),
    [detak],
  );

  const agendaBerstatus = useMemo(() => {
    return proker.agenda.map((a) => {
      const statusLive = now
        ? hitungStatusAgenda(
            new Date(a.tglPelaksanaan),
            a.waktuPelaksanaan,
            a.tglSelesai ? new Date(a.tglSelesai) : null,
            now,
          )
        : a.statusDihitung;
      return { ...a, statusLive };
    });
  }, [proker.agenda, now]);

  const kelompokAgenda = useMemo(
    () => ({
      sedang_berlangsung: agendaBerstatus.filter(
        (a) => a.statusLive === "sedang_berlangsung",
      ),
      akan_datang: agendaBerstatus.filter(
        (a) => a.statusLive === "akan_datang",
      ),
      selesai: agendaBerstatus.filter((a) => a.statusLive === "selesai"),
    }),
    [agendaBerstatus],
  );

  const tabEfektif: StatusAgendaDihitung =
    kelompokAgenda[tabStatus].length > 0
      ? tabStatus
      : ((
          [
            "sedang_berlangsung",
            "akan_datang",
            "selesai",
          ] as StatusAgendaDihitung[]
        ).find((k) => kelompokAgenda[k].length > 0) ?? tabStatus);

  const agendaTerlihat = kelompokAgenda[tabEfektif];

  // Sesi modal state
  const [modalSesi, setModalSesi] = useState<{
    agenda: AgendaItem;
    sesiAwal: SesiItem | null;
  } | null>(null);

  // Modal kelola banyak panitia & CSV
  const [modalPanitiaBuka, setModalPanitiaBuka] = useState(false);

  // Modal edit panitia tunggal
  const [modalEditPanitiaBuka, setModalEditPanitiaBuka] = useState(false);
  const [panitiaDiedit, setPanitiaDiedit] = useState<PanitiaItem | null>(null);
  const [selectedRoleKeyEdit, setSelectedRoleKeyEdit] = useState<string>("ketua_pelaksana");
  const [divisiPanitiaEdit, setDivisiPanitiaEdit] = useState<string>("");

  // Modal agenda state
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

  // Handler Edit Panitia Tunggal
  const handleOpenEditPanitia = (item: PanitiaItem) => {
    setPanitiaDiedit(item);
    const byLabelOrPeran =
      OPSI_PERAN_PANITIA.find(
        (o) => o.label.toLowerCase() === item.divisiPanitia?.toLowerCase(),
      ) || OPSI_PERAN_PANITIA.find((o) => o.peran === item.peran);
    setSelectedRoleKeyEdit(
      byLabelOrPeran ? byLabelOrPeran.key : OPSI_PERAN_PANITIA[0].key,
    );
    setDivisiPanitiaEdit(item.sto.divisi || "Umum");
    setModalEditPanitiaBuka(true);
  };

  const handleSubmitEditPanitia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panitiaDiedit) return;
    setPesan(null);

    const roleDef =
      OPSI_PERAN_PANITIA.find((r) => r.key === selectedRoleKeyEdit) ||
      OPSI_PERAN_PANITIA[0];

    const formData = new FormData();
    formData.append("peran", roleDef.peran);
    formData.append("divisiPanitia", roleDef.label);

    startTransition(async () => {
      const res = await ubahPanitiaAction(panitiaDiedit.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalEditPanitiaBuka(false);
        setPanitiaDiedit(null);
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
    setRadiusAgenda(item.radiusM || 500);
    setTitikAgenda(
      item.lat !== null && item.lng !== null
        ? { lat: item.lat, lng: item.lng }
        : null,
    );
    setTargetPeserta(item.targetPeserta);
    setModalEditAgendaBuka(true);
  };

  const pilihLokasiMaster = (idStr: string) => {
    setLokasiAgendaId(idStr);
    if (!idStr) return;
    const l = daftarLokasi.find((item) => String(item.id) === idStr);
    if (l) {
      setLokasiAgenda(l.nama);
      setRadiusAgenda(l.radiusM);
      setTitikAgenda({ lat: l.lat, lng: l.lng });
    }
  };

  const handleSubmitTambahAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
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
      const res = await buatAgendaAction(proker.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalAgendaBuka(false);
        resetFormAgenda();
      }
    });
  };

  const handleSubmitEditAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaDiedit) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("judul", judulAgenda);
    formData.append("jenis", jenisAgenda);
    formData.append("urutan", String(urutanAgenda));
    formData.append("tglPelaksanaan", tglAgenda);
    formData.append("tglSelesai", tglSelesaiAgenda || "");
    formData.append("waktuPelaksanaan", waktuAgenda);
    formData.append("targetPeserta", targetPeserta);
    formData.append("lokasiNama", lokasiAgenda || "");
    formData.append("lokasiId", lokasiAgendaId || "");
    if (titikAgenda) {
      formData.append("lat", String(titikAgenda.lat));
      formData.append("lng", String(titikAgenda.lng));
      formData.append("radiusM", String(radiusAgenda));
    }

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

  const handleHapusAgenda = async (agendaId: number, judulAgendaHapus: string) => {
    const setuju = await konfirmasiHapus({
      judul: "Hapus Agenda Kegiatan?",
      pesan: `Anda yakin ingin menghapus agenda "${judulAgendaHapus}"? Agenda hanya bisa dihapus bila belum punya sesi presensi.`,
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

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard/proker"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Daftar Proker
            </Link>
            <span className="text-slate-muted text-xs">•</span>
            <span className="text-xs font-medium text-slate-muted">
              Periode {proker.periode.nama}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {proker.nama}
          </h2>
          {proker.deskripsi && (
            <p className="text-xs text-slate-muted mt-1 leading-relaxed max-w-2xl">
              {proker.deskripsi}
            </p>
          )}
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {!isReadonly && (
            <>
              {tabAktif === "panitia" ? (
                <button
                  onClick={() => setModalPanitiaBuka(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Kelola Panitia (Banyak / CSV)
                </button>
              ) : (
                <button
                  onClick={() => {
                    resetFormAgenda();
                    setModalAgendaBuka(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Agenda
                </button>
              )}
            </>
          )}
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
            className="text-slate-muted hover:text-navy cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-px">
        <button
          onClick={() => setTabAktif("panitia")}
          className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            tabAktif === "agenda"
              ? "border-secondary text-secondary"
              : "border-transparent text-slate-muted hover:text-navy"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Agenda Kegiatan ({proker.agenda.length})
        </button>
      </div>

      {/* TAB 1: KEPANITIAAN CONTENT */}
      {tabAktif === "panitia" && (
        <PanitiaSection
          proker={proker}
          isReadonly={isReadonly}
          isPending={isPending}
          onEditPanitia={handleOpenEditPanitia}
          onHapusPanitia={handleHapusPanitia}
        />
      )}

      {/* TAB 2: AGENDA KEGIATAN CONTENT */}
      {tabAktif === "agenda" && (
        <AgendaSection
          proker={proker}
          isReadonly={isReadonly}
          isPending={isPending}
          tabStatus={tabStatus}
          tabEfektif={tabEfektif}
          kelompokAgenda={kelompokAgenda}
          agendaTerlihat={agendaTerlihat}
          now={now}
          rekap={rekap}
          setTabStatus={setTabStatus}
          onEditAgenda={handleOpenEditAgenda}
          onHapusAgenda={handleHapusAgenda}
          onOpenModalSesi={setModalSesi}
        />
      )}

      {/* Modal Kelola Banyak Panitia & Impor CSV */}
      <ModalKelolaPanitia
        isOpen={modalPanitiaBuka}
        proker={proker}
        availableStos={availableStos}
        onClose={() => setModalPanitiaBuka(false)}
        setPesan={setPesan}
        isPending={isPending}
        startTransition={startTransition}
      />

      {/* Modal Ubah Panitia Tunggal */}
      <ModalEditPanitia
        isOpen={modalEditPanitiaBuka}
        panitiaDiedit={panitiaDiedit}
        selectedRoleKeyEdit={selectedRoleKeyEdit}
        divisiPanitiaEdit={divisiPanitiaEdit}
        isPending={isPending}
        setSelectedRoleKeyEdit={setSelectedRoleKeyEdit}
        onClose={() => {
          setModalEditPanitiaBuka(false);
          setPanitiaDiedit(null);
        }}
        onSubmit={handleSubmitEditPanitia}
      />

      {/* Modal Tambah / Edit Agenda */}
      <ModalAgenda
        isOpen={modalAgendaBuka || modalEditAgendaBuka}
        isEdit={modalEditAgendaBuka}
        isPending={isPending}
        judulAgenda={judulAgenda}
        jenisAgenda={jenisAgenda}
        urutanAgenda={urutanAgenda}
        tglAgenda={tglAgenda}
        tglSelesaiAgenda={tglSelesaiAgenda}
        waktuAgenda={waktuAgenda}
        targetPeserta={targetPeserta}
        lokasiAgenda={lokasiAgenda}
        lokasiAgendaId={lokasiAgendaId}
        radiusAgenda={radiusAgenda}
        titikAgendaAktif={titikAgendaAktif}
        daftarLokasi={daftarLokasi}
        setJudulAgenda={setJudulAgenda}
        setJenisAgenda={setJenisAgenda}
        setUrutanAgenda={setUrutanAgenda}
        setTglAgenda={setTglAgenda}
        setTglSelesaiAgenda={setTglSelesaiAgenda}
        setWaktuAgenda={setWaktuAgenda}
        setTargetPeserta={setTargetPeserta}
        setLokasiAgenda={setLokasiAgenda}
        setRadiusAgenda={setRadiusAgenda}
        setTitikAgenda={setTitikAgenda}
        pilihLokasiMaster={pilihLokasiMaster}
        onClose={() => {
          setModalAgendaBuka(false);
          setModalEditAgendaBuka(false);
          resetFormAgenda();
        }}
        onSubmit={modalAgendaBuka ? handleSubmitTambahAgenda : handleSubmitEditAgenda}
      />

      {/* MODAL SESI PRESENSI (buat/ubah) */}
      {modalSesi && (
        <SesiModal
          agendaId={modalSesi.agenda.id}
          judulAgenda={modalSesi.agenda.judul}
          tglMulai={keTanggalWib(modalSesi.agenda.tglPelaksanaan)}
          tglSelesai={
            modalSesi.agenda.tglSelesai
              ? keTanggalWib(modalSesi.agenda.tglSelesai)
              : null
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
