"use client";

import { motion } from "framer-motion";

export interface TabStatusAgenda<T extends string = string> {
  id: T;
  label: string;
  count: number;
}

interface Props<T extends string> {
  items: ReadonlyArray<TabStatusAgenda<T>>;
  value: T;
  onChange: (id: T) => void;
  /**
   * ID unik untuk animasi pill. Beri nilai berbeda bila ada dua tab agenda
   * tampil bersamaan agar indikator tidak "melompat" antar komponen.
   */
  layoutId?: string;
}

/**
 * Tab status agenda (Akan Datang / Sedang Berlangsung / Selesai).
 *
 * Satu komponen untuk dashboard STO dan halaman detail proker (adsek) supaya
 * tampilan dan perilakunya identik.
 */
export function AgendaStatusTabs<T extends string>({
  items,
  value,
  onChange,
  layoutId = "agenda-status-tab",
}: Props<T>) {
  return (
    <div
      className="overflow-x-auto rounded-full border border-[#E2E8F0] bg-surface p-1.5 shadow-sm scrollbar-none"
      data-lenis-prevent-horizontal
    >
      <div className="flex min-w-full items-center gap-1.5 sm:min-w-0 sm:grid sm:grid-cols-3">
        {items.map((tab) => {
          const aktif = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className="relative flex flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-200 focus:outline-none sm:px-5"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span
                  className={`transition-colors duration-200 ${
                    aktif
                      ? "font-extrabold text-primary"
                      : "text-slate-muted hover:text-navy"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-all ${
                    aktif
                      ? "bg-primary text-white shadow-sm"
                      : "bg-[#E2E8F0] text-slate-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </span>

              {aktif && (
                <motion.div
                  initial={false}
                  layoutId={layoutId}
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 z-0 rounded-full border border-[#CBD5E1] bg-white shadow-[0_2px_10px_rgba(11,42,91,0.12)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
