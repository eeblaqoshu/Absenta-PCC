// app/(adsek)/dashboard/page.tsx
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPeriode } from "@prisma/client";
import { Calendar, FolderKanban, Users, ShieldCheck, ArrowRight, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { hitungLeaderboard } from "@/lib/rekap-poin";

export default async function AdsekDashboardPage() {
  const adsek = await requireAdsek();

  // Ambil periode aktif dan statistik
  const periodeAktif = await prisma.periode.findFirst({
    where: { status: StatusPeriode.aktif },
    include: {
      _count: {
        select: {
          sto: true,
          proker: true,
        },
      },
    },
  });

  const totalProker = periodeAktif?._count.proker ?? 0;
  const totalSto = periodeAktif?._count.sto ?? 0;

  // Hitung total agenda periode aktif
  const totalAgenda = periodeAktif
    ? await prisma.agenda.count({
        where: { proker: { periodeId: periodeAktif.id } },
      })
    : 0;

  // Ringkasan poin: tampilkan 3 teratas di dashboard (detail di /dashboard/leaderboard).
  const rekapPoin = periodeAktif ? await hitungLeaderboard(periodeAktif.id) : null;
  const topPoin = rekapPoin?.baris.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      {/* Banner Periode Aktif */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_2px_8px_rgba(11,42,91,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                periodeAktif ? "bg-accent animate-pulse" : "bg-highlight"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                periodeAktif
                  ? "text-secondary"
                  : "text-[#B45309]"
              }`}
            >
              {periodeAktif ? "Periode Aktif Berjalan" : "Tidak Ada Periode Aktif"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary">
            {periodeAktif?.nama || "Sistem Belum Memiliki Periode Aktif"}
          </h2>
          <p className="text-xs text-slate-muted mt-1">
            {periodeAktif
              ? `Dimulai: ${new Date(periodeAktif.tglMulai).toLocaleDateString("id-ID")} • Selesai: ${new Date(
                  periodeAktif.tglSelesai
                ).toLocaleDateString("id-ID")}`
              : "Silakan buka periode baru melalui menu Kelola Periode (Admin)."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
            {adsek.role.replace("_", " ").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Ringkasan Angka Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-muted">Total Pengurus STO</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {totalSto}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-muted">Program Kerja (Proker)</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {totalProker}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-primary flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-secondary" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-muted">Total Agenda Kegiatan</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {totalAgenda}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-highlight/15 text-[#B45309] flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#B45309]" />
          </div>
        </div>
      </div>

      {/* Ringkasan Poin: Top 3 */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top 3 Poin Kehadiran
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {rekapPoin?.periodeNama ?? "Belum ada periode aktif"} •{" "}
              {rekapPoin?.totalSesiDihitung ?? 0} sesi ditutup dihitung
            </p>
          </div>
          <Link
            href="/dashboard/leaderboard"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 hover:underline"
          >
            Lihat leaderboard lengkap
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {topPoin.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">
            Belum ada sesi presensi yang selesai pada periode ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topPoin.map((b) => (
              <div
                key={b.stoId}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg leading-none">
                    {["🥇", "🥈", "🥉"][b.peringkat - 1] ?? `#${b.peringkat}`}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      b.poin > 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : b.poin < 0
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {b.poin} poin
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">
                  {b.nama}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">{b.divisi ?? "Umum"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Menu Cepat Navigasi Modul Master Data */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-navy">
          Modul Master Data Organisasi
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/proker"
            className="p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FolderKanban className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                Program Kerja & Agenda
              </h4>
              <p className="text-xs text-slate-muted mt-1">
                Kelola proker, kepanitiaan (PI/PJ/Anggota), serta agenda kegiatan.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
              Buka Proker <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {adsek.role === "admin" && (
            <>
              <Link
                href="/dashboard/sto"
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-accent/20 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                    Data Pengurus STO
                  </h4>
                  <p className="text-xs text-slate-muted mt-1">
                    Kelola data pengurus STO manual dan impor massal dari file CSV.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                  Kelola STO <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/dashboard/periode"
                className="p-5 rounded-2xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-highlight/20 text-[#B45309] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                    Kelola Periode
                  </h4>
                  <p className="text-xs text-slate-muted mt-1">
                    Buka periode kepengurusan baru atau tutup periode (read-only).
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                  Kelola Periode <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
