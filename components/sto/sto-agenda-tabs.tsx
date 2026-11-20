"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, QrCode } from "lucide-react";
import Link from "next/link";
import { AgendaStatusTabs } from "@/components/ui/agenda-status-tabs";
import { EmptyAgenda } from "@/components/ui/empty-agenda";

export interface AgendaItem {
  id: number;
  judul: string;
  prokerNama: string;
  jenis: string;
  tglFormatted: string;
  jamFormatted: string;
  lokasiNama: string | null;
  targetPeserta: string;
  statusDihitung: "akan_datang" | "sedang_berlangsung" | "selesai";
  adaSesiAktif: boolean;
  sudahPresensi: boolean;
  statusPresensi: "hadir" | "terlambat" | null;
  diLuarRadius: boolean;
  statusVerifikasi: "menunggu" | "diterima" | "ditolak" | null;
  izin: {
    jenis: "terlambat" | "sakit" | "izin" | "lainnya";
    status: "menunggu" | "disetujui" | "ditolak";
    alasan: string;
  } | null;
}

export function StoAgendaTabs({
  akanDatang,
  sedangBerlangsung,
  selesai,
}: {
  akanDatang: AgendaItem[];
  sedangBerlangsung: AgendaItem[];
  selesai: AgendaItem[];
}) {
  const [activeTab, setActiveTab] = useState<"mendatang" | "berlangsung" | "selesai">("mendatang");

  const tabs = [
    {
      id: "mendatang" as const,
      label: "Akan Datang",
      count: akanDatang.length,
      data: akanDatang,
    },
    {
      id: "berlangsung" as const,
      label: "Sedang Berlangsung",
      count: sedangBerlangsung.length,
      data: sedangBerlangsung,
    },
    {
      id: "selesai" as const,
      label: "Selesai",
      count: selesai.length,
      data: selesai,
    },
  ];

  const currentTabData = tabs.find((t) => t.id === activeTab)?.data || [];

  return (
    <div className="space-y-4">
      <AgendaStatusTabs
        items={tabs.map((tab) => ({ id: tab.id, label: tab.label, count: tab.count }))}
        value={activeTab}
        onChange={setActiveTab}
        layoutId="sto-agenda-tabs"
      />

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {currentTabData.length === 0 ? (
            <EmptyAgenda />
          ) : (
            currentTabData.map((agenda) => (
              <div
                key={agenda.id}
                className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-primary uppercase tracking-wide border border-accent/30">
                      {agenda.jenis.replace("_", " ")}
                    </span>
                    <span className="text-xs text-slate-muted">•</span>
                    <span className="text-xs font-semibold text-secondary">
                      {agenda.prokerNama}
                    </span>
                    {agenda.statusDihitung === "sedang_berlangsung" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sedang berlangsung
                      </span>
                    ) : agenda.statusDihitung === "selesai" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E2E8F0] text-slate-muted">
                        Selesai
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-highlight/15 text-[#8a6500]">
                        Belum mulai
                      </span>
                    )}
                    {agenda.izin && (
                      <span
                        title={agenda.izin.alasan}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          agenda.izin.status === "disetujui"
                            ? "bg-emerald-50 text-emerald-700"
                            : agenda.izin.status === "menunggu"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        Izin {agenda.izin.status}
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-primary tracking-tight">
                    {agenda.judul}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-muted">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      <span>{agenda.tglFormatted}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-secondary" />
                      <span>{agenda.jamFormatted}</span>
                    </div>
                    {agenda.lokasiNama && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-accent" />
                        <span>{agenda.lokasiNama}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status / Aksi Presensi */}
                <div className="sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#E2E8F0]">
                  {agenda.adaSesiAktif && agenda.sudahPresensi ? (
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/70">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sudah Presensi
                        {agenda.statusPresensi && (
                          <span className="text-[10px] font-medium opacity-80">
                            ({agenda.statusPresensi})
                          </span>
                        )}
                      </span>
                      {agenda.diLuarRadius && (
                        <span
                          className={`text-[10px] font-semibold ${
                            agenda.statusVerifikasi === "ditolak"
                              ? "text-rose-600"
                              : agenda.statusVerifikasi === "menunggu"
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          di luar radius •{" "}
                          {agenda.statusVerifikasi === "menunggu"
                            ? "menunggu verifikasi adsek"
                            : agenda.statusVerifikasi === "ditolak"
                              ? "ditolak adsek"
                              : "diterima adsek"}
                        </span>
                      )}
                    </div>
                  ) : agenda.adaSesiAktif ? (
                    <Link
                      href="/scan"
                      className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-secondary hover:bg-primary text-white font-semibold text-xs shadow-md shadow-secondary/25 transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Scan Presensi
                    </Link>
                  ) : agenda.statusDihitung === "selesai" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-[#E2E8F0] text-slate-muted text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-muted" />
                      Kegiatan Selesai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-[#E2E8F0] text-slate-muted text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-highlight" />
                      Belum Dibuka
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
