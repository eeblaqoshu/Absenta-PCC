// components/dashboard/leaderboard-sto.tsx
// Papan poin kehadiran STO pada periode aktif.
import type { RekapPoin } from "@/lib/rekap-poin";
import {
  Trophy,
  TrendingDown,
  Clock,
  CheckCircle2,
  FileInput,
  CalendarCheck,
} from "lucide-react";

const MEDALI = ["🥇", "🥈", "🥉"];

const PODIUM = [
  "border-highlight/40 bg-gradient-to-br from-highlight/15 to-white",
  "border-[#CBD5E1] bg-gradient-to-br from-surface to-white",
  "border-accent/30 bg-gradient-to-br from-accent/10 to-white",
];

export function LeaderboardSto({ rekap }: { rekap: RekapPoin }) {
  const { baris, periodeNama, totalSesiDihitung } = rekap;
  const top3 = baris.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Podium 3 teratas */}
      {top3.length > 0 && (
        <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold text-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15">
              <Trophy className="h-4 w-4 text-[#B45309]" />
            </span>
           3 STO Peringkat Teratas
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {top3.map((b) => (
              <div
                key={b.stoId}
                className={`rounded-2xl border p-4 ${PODIUM[b.peringkat - 1] ?? "border-[#E2E8F0] bg-white"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg leading-none">
                    {MEDALI[b.peringkat - 1] ?? `#${b.peringkat}`}
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      b.poin > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : b.poin < 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-surface text-slate-muted"
                    }`}
                  >
                    {b.poin} poin
                  </span>
                </div>
                <p className="mt-2.5 truncate text-xs font-bold text-primary">{b.nama}</p>
                <p className="truncate text-[11px] text-slate-muted">
                  {b.divisi ?? "Umum"} • {b.tepatWaktu} tepat waktu
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabel lengkap */}
      <div className="space-y-4 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-primary">
              Leaderboard Poin Kehadiran
            </h2>
            <p className="mt-0.5 text-xs text-slate-muted">
              {periodeNama ?? "Belum ada periode aktif"} • {totalSesiDihitung} sesi ditutup dihitung
            </p>
          </div>
          <div className="text-[11px] leading-relaxed text-slate-muted">
            <p className="font-semibold text-navy">Ketentuan poin</p>
            <p>+2 hadir tepat waktu (≤15 menit)</p>
            <p>+1 hadir terlambat (&gt;15 menit)</p>
            <p>0 izin disetujui (tidak hadir)</p>
            <p>-2 alpa / tidak hadir tanpa izin</p>
            <p className="text-secondary font-medium">+2 bonus peran Ketuplak &amp; Waketuplak</p>
          </div>
        </div>

        {baris.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-muted">
            Belum ada sesi presensi yang selesai pada periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-none" data-lenis-prevent>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-[11px] uppercase tracking-wide text-slate-muted">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Divisi</th>
                  <th className="py-2 pr-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Tepat
                    </span>
                  </th>
                  <th className="py-2 pr-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Telat
                    </span>
                  </th>
                  <th className="py-2 pr-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Alpa
                    </span>
                  </th>
                  <th className="py-2 pr-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <FileInput className="h-3 w-3" />
                      Izin
                    </span>
                  </th>
                  <th className="py-2 pr-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="h-3 w-3" />
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
                    className="border-b border-[#E2E8F0] last:border-0 hover:bg-surface/60"
                  >
                    <td className="py-2.5 pr-2 font-bold text-slate-muted">
                      {MEDALI[b.peringkat - 1] ?? b.peringkat}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-navy">{b.nama}</p>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-muted">{b.divisi ?? "Umum"}</td>
                    <td className="py-2.5 pr-3 text-center text-emerald-600">{b.tepatWaktu}</td>
                    <td className="py-2.5 pr-3 text-center text-amber-600">{b.terlambat}</td>
                    <td className="py-2.5 pr-3 text-center text-rose-600">{b.alpa}</td>
                    <td className="py-2.5 pr-3 text-center text-slate-muted">
                      {b.izinTidakHadir}
                    </td>
                    <td className="py-2.5 pr-3 text-center text-slate-muted">{b.totalSesiWajib}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`rounded-lg px-2 py-1 font-bold ${
                          b.poin > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : b.poin < 0
                              ? "bg-rose-100 text-rose-700"
                              : "bg-surface text-slate-muted"
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
    </div>
  );
}
