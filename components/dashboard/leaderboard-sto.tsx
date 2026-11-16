// components/dashboard/leaderboard-sto.tsx
// Papan poin kehadiran STO pada periode aktif.
import type { RekapPoin } from "@/lib/rekap-poin";
import { Trophy, TrendingDown, Clock, CheckCircle2, FileInput, CalendarCheck } from "lucide-react";

const MEDALI = ["🥇", "🥈", "🥉"];

export function LeaderboardSto({ rekap }: { rekap: RekapPoin }) {
  const { baris, periodeNama, totalSesiDihitung } = rekap;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 inline-flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Leaderboard Poin Kehadiran
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {periodeNama ?? "Belum ada periode aktif"} • {totalSesiDihitung} sesi ditutup dihitung
          </p>
        </div>
        <div className="text-[11px] text-zinc-500 leading-relaxed">
          <p className="font-semibold text-zinc-600 dark:text-zinc-300">Ketentuan poin</p>
          <p>+2 hadir tepat waktu (≤15 menit)</p>
          <p>-2 terlambat tanpa izin &amp; alpa tanpa izin</p>
          <p>0 terlambat dengan izin &amp; alpa dengan izin</p>
        </div>
      </div>

      {baris.length === 0 ? (
        <p className="text-xs text-zinc-500 py-6 text-center">
          Belum ada sesi presensi yang selesai pada periode ini.
        </p>
      ) : (
        <div className="overflow-x-auto scrollbar-none" data-lenis-prevent>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Divisi</th>
                <th className="py-2 pr-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Tepat
                  </span>
                </th>
                <th className="py-2 pr-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Telat
                  </span>
                </th>
                <th className="py-2 pr-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Alpa
                  </span>
                </th>
                <th className="py-2 pr-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <FileInput className="w-3 h-3" />
                    Izin
                  </span>
                </th>
                <th className="py-2 pr-3 text-center">
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="w-3 h-3" />
                    Sesi
                  </span>
                </th>
                <th className="py-2 text-right">Poin</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr
                  key={b.stoId}
                  className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                >
                  <td className="py-2.5 pr-2 font-bold text-zinc-500">
                    {MEDALI[b.peringkat - 1] ?? b.peringkat}
                  </td>
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100">{b.nama}</p>
                    <p className="text-[11px] text-zinc-500">{b.nim}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-500">{b.divisi ?? "Umum"}</td>
                  <td className="py-2.5 pr-3 text-center text-emerald-600 dark:text-emerald-400">
                    {b.tepatWaktu}
                  </td>
                  <td className="py-2.5 pr-3 text-center text-amber-600 dark:text-amber-400">
                    {b.terlambat}
                  </td>
                  <td className="py-2.5 pr-3 text-center text-red-600 dark:text-red-400">{b.alpa}</td>
                  <td className="py-2.5 pr-3 text-center text-zinc-500">{b.izinTidakHadir}</td>
                  <td className="py-2.5 pr-3 text-center text-zinc-500">{b.totalSesiWajib}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`px-2 py-1 rounded-lg font-bold ${
                        b.poin > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : b.poin < 0
                            ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {b.poin}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
