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

  const rekap = await hitungLeaderboard(
    periodeAktif?.id,
    new Date(),
    bulanParam,
  );

  return (
    <div className="py-2 space-y-4 sm:space-y-5">
      <div className="rounded-2xl sm:rounded-3xl border border-[#E2E8F0] bg-white p-4 sm:p-6 shadow-sm space-y-3 sm:space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0" />
                <span className="text-xs font-semibold whitespace-nowrap text-secondary">
                  {rekap.periodeNama ?? "Belum Ada Periode Aktif"}
                </span>
              </div>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-primary leading-tight">
              Leaderboard Poin Kehadiran
            </h1>
            <p className="mt-1 text-xs text-slate-muted leading-relaxed">
              Rekap poin bulanan pengurus STO dari sesi kegiatan{" "}
              <strong>Hari H</strong> yang telah selesai.
            </p>
          </div>

          <FilterBulanLeaderboard
            bulanAktif={rekap.bulanAktif}
            opsiBulan={rekap.opsiBulan}
          />
        </div>

        <div className="pt-2 sm:pt-3 border-t border-[#E2E8F0]">
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-surface/80 border border-[#E2E8F0] flex items-start gap-2.5 sm:gap-3 text-[11px] sm:text-xs text-slate-muted leading-relaxed">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <div className="flex-1 space-y-1.5">
              <p className="font-semibold text-primary">
                Ketentuan Poin Kehadiran:
              </p>
              <ul className="space-y-1 sm:space-y-1.5 pl-0.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-secondary font-bold shrink-0">•</span>
                  <span>
                    <strong>Acara Hari H:</strong> +2 hadir tepat waktu, +1
                    terlambat, 0 izin disetujui, -2 alpa tanpa izin.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-secondary font-bold shrink-0">•</span>
                  <span>
                    <strong>Kegiatan Non-Hari H:</strong> Rapat PJ, Rapat Besar
                    (Rabes), dan Rapat Koordinasi (Rakoor) bernilai{" "}
                    <strong>0 poin</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-secondary font-bold shrink-0">•</span>
                  <span>
                    Presensi di luar radius yang berstatus ditolak adsek tidak
                    dihitung sebagai kehadiran.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <LeaderboardSto rekap={rekap} />
    </div>
  );
}
