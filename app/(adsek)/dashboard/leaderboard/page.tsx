// app/(adsek)/dashboard/leaderboard/page.tsx
// Papan poin kehadiran STO pada periode aktif (halaman tersendiri).
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hitungLeaderboard } from "@/lib/rekap-poin";
import { LeaderboardSto } from "@/components/dashboard/leaderboard-sto";
import { StatusPeriode } from "@prisma/client";
import { Trophy, Info } from "lucide-react";

export default async function LeaderboardPage() {
  // Semua adsek (admin & sekretaris) boleh melihat rekap poin.
  await requireAdsek();

  const periodeAktif = await prisma.periode.findFirst({
    where: { status: StatusPeriode.aktif },
  });

  const rekap = await hitungLeaderboard(periodeAktif?.id);

  return (
    <div className="py-2 space-y-5">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <h1 className="inline-flex items-center gap-2 text-base font-bold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-highlight/15">
            <Trophy className="h-4 w-4 text-[#B45309]" />
          </span>
          Leaderboard Poin Kehadiran
        </h1>
        <p className="mt-1 text-xs text-slate-muted">
          Akumulasi poin seluruh STO pada periode aktif. Poin dihitung dari sesi presensi yang
          sudah ditutup.
        </p>
        <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-slate-muted">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-secondary" />
          Presensi yang ditolak adsek (di luar radius) tidak dihitung sebagai kehadiran.
        </p>
      </div>

      <LeaderboardSto rekap={rekap} />
    </div>
  );
}
