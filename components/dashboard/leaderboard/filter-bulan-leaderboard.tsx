// components/dashboard/filter-bulan-leaderboard.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Calendar } from "lucide-react";
import type { OpsiBulanLeaderboard } from "@/lib/rekap-poin";

interface FilterBulanLeaderboardProps {
  bulanAktif: string;
  opsiBulan: OpsiBulanLeaderboard[];
}

export function FilterBulanLeaderboard({
  bulanAktif,
  opsiBulan,
}: FilterBulanLeaderboardProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nilaiBaru: string) {
    const params = new URLSearchParams();
    params.set("bulan", nilaiBaru);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
      <label
        htmlFor="filter-bulan-leaderboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted whitespace-nowrap shrink-0"
      >
        <Calendar className="w-3.5 h-3.5 text-secondary" />
        Bulan:
      </label>
      <div className="relative flex-1 sm:flex-initial">
        <select
          id="filter-bulan-leaderboard"
          suppressHydrationWarning
          value={bulanAktif}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full sm:w-auto rounded-xl border border-[#CBD5E1] bg-surface px-3 py-2 text-xs font-semibold text-primary focus:border-secondary focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer"
        >
          {opsiBulan.map((opsi) => (
            <option key={opsi.nilai} value={opsi.nilai}>
              {opsi.label}
            </option>
          ))}
          <option value="semua">Semua Bulan (Akumulasi Periode)</option>
        </select>
      </div>
    </div>
  );
}
