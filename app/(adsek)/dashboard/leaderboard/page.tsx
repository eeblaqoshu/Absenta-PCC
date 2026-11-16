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
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50 inline-flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Leaderboard Poin Kehadiran
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Akumulasi poin seluruh STO pada periode aktif. Poin dihitung dari sesi presensi yang
          sudah ditutup.
        </p>
        <p className="mt-3 text-[11px] text-zinc-500 inline-flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          Presensi yang ditolak adsek (di luar radius) tidak dihitung sebagai kehadiran.
        </p>
      </div>

      <LeaderboardSto rekap={rekap} />
    </div>
  );
}
