// app/(adsek)/dashboard/leaderboard/page.tsx
// Papan poin kehadiran STO per bulan pada periode aktif (khusus kegiatan Hari H).
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hitungLeaderboard } from "@/lib/rekap-poin";
import { LeaderboardSto } from "@/components/dashboard/leaderboard-sto";
import { FilterBulanLeaderboard } from "@/components/dashboard/filter-bulan-leaderboard";
import { StatusPeriode } from "@prisma/client";
import { Info } from "lucide-react";

interface LeaderboardPageProps {
  searchParams?: Promise<{ bulan?: string }>;
}

export default async function LeaderboardPage({
  searchParams,
}: LeaderboardPageProps) {
  // Semua adsek (admin & sekretaris) boleh melihat rekap poin.
  await requireAdsek();

  const resolvedParams = searchParams ? await searchParams : {};
  const bulanParam =
    typeof resolvedParams.bulan === "string" ? resolvedParams.bulan : undefined;

  const periodeAktif = await prisma.periode.findFirst({
    where: { status: StatusPeriode.aktif },
  });

  const rekap = await hitungLeaderboard(periodeAktif?.id, new Date(), bulanParam);

  return (
    <div className="py-2 space-y-5">
      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-secondary">
                {rekap.periodeNama ?? "Belum Ada Periode Aktif"}
              </span>
              <span className="text-slate-muted text-xs">•</span>
              <span className="text-xs font-semibold text-slate-muted">
                {rekap.bulanAktifLabel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              Leaderboard Poin Kehadiran
            </h1>
            <p className="mt-1 text-xs text-slate-muted">
              Rekap poin bulanan pengurus STO dari sesi kegiatan <strong>Hari H</strong> yang telah selesai.
            </p>
          </div>

          <FilterBulanLeaderboard
            bulanAktif={rekap.bulanAktif}
            opsiBulan={rekap.opsiBulan}
          />
        </div>

        <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-start gap-2 text-[11px] text-slate-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
          <span>
            Poin <strong>hanya dihitung pada acara Hari H</strong> (+2 tepat waktu, +1 terlambat, 0 izin disetujui, -2 alpa). Rapat PJ, Rapat Besar (Rabes), dan Rapat Koordinasi (Rakoor) bernilai <strong>0 poin</strong>. Presensi di luar radius yang ditolak adsek tidak dihitung hadir.
          </span>
        </div>
      </div>

      <LeaderboardSto rekap={rekap} />
    </div>
  );
}
