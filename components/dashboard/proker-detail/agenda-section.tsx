// components/dashboard/proker-detail/agenda-section.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  QrCode,
  Users,
  Pencil,
} from "lucide-react";
import { AgendaStatusTabs } from "@/components/ui/agenda-status-tabs";
import { EmptyAgenda } from "@/components/ui/empty-agenda";
import {
  formatTanggalIndo,
  jamDariWaktuAgenda,
  hitungStatusSesi,
  type StatusAgendaDihitung,
} from "@/lib/waktu";
import type { RekapKehadiranSesi } from "@/lib/kehadiran";
import {
  getJenisAgendaBadge,
  getTargetPesertaLabel,
  keInputJam,
  type AgendaItem,
  type ProkerData,
} from "./types";
import type { SesiItem } from "@/components/dashboard/sesi-modal";

interface AgendaWithLive extends AgendaItem {
  statusLive: StatusAgendaDihitung;
}

interface Props {
  proker: ProkerData;
  isReadonly: boolean;
  isPending: boolean;
  tabStatus: StatusAgendaDihitung;
  tabEfektif: StatusAgendaDihitung;
  kelompokAgenda: Record<StatusAgendaDihitung, AgendaWithLive[]>;
  agendaTerlihat: AgendaWithLive[];
  now: Date;
  rekap: Record<number, RekapKehadiranSesi>;
  setTabStatus: (v: StatusAgendaDihitung) => void;
  onEditAgenda: (agenda: AgendaItem) => void;
  onHapusAgenda: (id: number, judul: string) => void;
  onOpenModalSesi: (params: { agenda: AgendaItem; sesiAwal: SesiItem | null }) => void;
}

export function AgendaSection({
  proker,
  isReadonly,
  isPending,
  tabEfektif,
  kelompokAgenda,
  agendaTerlihat,
  now,
  rekap,
  setTabStatus,
  onEditAgenda,
  onHapusAgenda,
  onOpenModalSesi,
}: Props) {
  return (
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
        <EmptyAgenda
          judul="Belum ada agenda untuk proker ini"
          deskripsi='Klik tombol "Tambah Agenda" untuk membuat jadwal rapat atau hari H kegiatan.'
        />
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
                  className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${jenisBadge.color}`}
                        >
                          {jenisBadge.label}
                        </span>
                        <span className="text-xs text-slate-muted">
                          • {targetText}
                        </span>
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
                            onClick={() => onEditAgenda(item)}
                            title="Edit Agenda"
                            className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onHapusAgenda(item.id, item.judul)}
                            disabled={isPending}
                            title="Hapus Agenda"
                            className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {!isReadonly && sedangBerjalan && (
                        <button
                          onClick={() => onOpenModalSesi({ agenda: item, sesiAwal: null })}
                          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-secondary hover:bg-primary text-white font-semibold text-xs shadow-md shadow-secondary/25 transition-all cursor-pointer"
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
                      <div className="rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] overflow-hidden bg-surface/30">
                        {item.sesi.map((sesi) => {
                          const statusSesi = hitungStatusSesi(
                            new Date(sesi.bukaAt),
                            new Date(sesi.tutupAt),
                            now ?? undefined,
                          );
                          const rekapSesi = rekap[sesi.id];
                          return (
                            <div
                              key={sesi.id}
                              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 bg-surface/50 hover:bg-surface transition-colors"
                            >
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-muted">
                                <span className="inline-flex items-center gap-1 font-semibold text-navy">
                                  <QrCode className="w-3.5 h-3.5 text-secondary" />
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
                                    {rekapSesi.ringkasan.hadir + rekapSesi.ringkasan.terlambat}
                                    /{rekapSesi.ringkasan.total}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {statusSesi === "berjalan" && (
                                  <Link
                                    href={`/dashboard/presensi/${sesi.id}`}
                                    className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-secondary hover:bg-primary text-white font-semibold text-xs shadow-md shadow-secondary/25 transition-all"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    Layar QR
                                  </Link>
                                )}
                                <Link
                                  href={`/dashboard/presensi/${sesi.id}`}
                                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-[#E2E8F0] hover:bg-surface text-navy font-semibold text-xs shadow-xs transition-all"
                                >
                                  <Users className="w-3.5 h-3.5 text-secondary" />
                                  Daftar Hadir
                                </Link>
                                {!isReadonly && !sudahSelesai && (
                                  <button
                                    onClick={() =>
                                      onOpenModalSesi({
                                        agenda: item,
                                        sesiAwal: {
                                          id: sesi.id,
                                          bukaAt: new Date(sesi.bukaAt),
                                          tutupAt: new Date(sesi.tutupAt),
                                        },
                                      })
                                    }
                                    title="Ubah sesi"
                                    className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
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
  );
}
