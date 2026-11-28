// app/(adsek)/dashboard/page.tsx
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPeriode } from "@prisma/client";
import {
  Calendar,
  FolderKanban,
  Users,
  ArrowRight,
  Clock,
  Trophy,
  MapPin,
  User,
} from "lucide-react";
import Link from "next/link";
import { hitungLeaderboard } from "@/lib/rekap-poin";

export default async function AdsekDashboardPage() {
  const adsek = await requireAdsek();
  const isAdmin = adsek.role === "admin";

  let periodeAktif: Awaited<
    ReturnType<
      typeof prisma.periode.findFirst<{
        include: { _count: { select: { sto: true; proker: true } } };
      }>
    >
  > = null;

  let totalProker = 0;
  let totalSto = 0;
  let totalAgenda = 0;
  let topPoin: {
    peringkat: number;
    stoId: number;
    nama: string;
    nim: string;
    divisi: string | null;
    poin: number;
  }[] = [];
  let periodeNamaRekap: string | null = null;
  let bulanLabelRekap: string | null = null;

  try {
    periodeAktif = await prisma.periode.findFirst({
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

    totalProker = periodeAktif?._count.proker ?? 0;
    totalSto = periodeAktif?._count.sto ?? 0;

    if (periodeAktif) {
      totalAgenda = await prisma.agenda
        .count({
          where: { proker: { periodeId: periodeAktif.id } },
        })
        .catch(() => 0);

      // Leaderboard hanya dihitung dan ditampilkan untuk role admin
      if (isAdmin) {
        const rekapPoin = await hitungLeaderboard(periodeAktif.id).catch(
          () => null,
        );
        if (rekapPoin) {
          periodeNamaRekap = rekapPoin.periodeNama;
          bulanLabelRekap = rekapPoin.bulanAktifLabel;
          topPoin = rekapPoin.baris.slice(0, 3);
        }
      }
    }
  } catch (err) {
    console.error("Gagal memuat statistik dashboard:", err);
  }

  const formatTanggal = (d: Date | string | null | undefined) => {
    if (!d) return "-";
    try {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return "-";
      return parsed.toLocaleDateString("id-ID");
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Periode Aktif */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                periodeAktif ? "bg-accent animate-pulse" : "bg-highlight"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                periodeAktif ? "text-secondary" : "text-[#B45309]"
              }`}
            >
              {periodeAktif ? "Periode Aktif" : "Tidak Ada Periode Aktif"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            {periodeAktif?.nama || "Sistem Belum Memiliki Periode Aktif"}
          </h2>
          <p className="text-xs text-slate-muted mt-1">
            {periodeAktif
              ? `Dimulai: ${formatTanggal(periodeAktif.tglMulai)} • Selesai: ${formatTanggal(
                  periodeAktif.tglSelesai,
                )}`
              : "Silakan buka periode baru melalui menu Kelola Periode (Admin)."}
          </p>
        </div>
      </div>

      {/* Statistik & Modul berdampingan dengan komponen card Top 3 (khusus admin) */}
      <div className={isAdmin ? "grid grid-cols-1 gap-6 lg:grid-cols-12" : "space-y-6"}>
        <div className={isAdmin ? "space-y-6 lg:col-span-8" : "space-y-6"}>
          {/* Ringkasan Angka Statistik */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-muted">
                  Total Pengurus STO
                </p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {totalSto}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-muted">
                  Program Kerja & Agenda
                </p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {totalProker}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-accent/15 text-primary flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-secondary" />
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-muted">
                  Total Kegiatan
                </p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {totalAgenda}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-highlight/15 text-[#B45309] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#B45309]" />
              </div>
            </div>
          </div>

          {/* Menu Navigasi Cepat untuk Modul Master Data */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-navy">
              Modul Master Data Organisasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Program Kerja & Agenda */}
              <Link
                href="/dashboard/proker"
                className="p-5 rounded-3xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                    Program Kerja & Agenda
                  </h4>
                  <p className="text-xs text-slate-muted mt-1">
                    Kelola proker, kepanitiaan (PI/PJ/Anggota), serta kegiatan.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                  Buka Proker{" "}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Data Pengurus STO */}
              <Link
                href="/dashboard/sto"
                className="p-5 rounded-3xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-accent/20 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 text-secondary" />
                  </div>
                  <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                    Data Pengurus STO
                  </h4>
                  <p className="text-xs text-slate-muted mt-1">
                    Kelola master data pengurus STO, tanda tangan digital, dan impor CSV.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                  Kelola STO{" "}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Titik Lokasi Presensi */}
              <Link
                href="/dashboard/lokasi"
                className="p-5 rounded-3xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 text-secondary border border-sky-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <MapPin className="w-5 h-5 text-secondary" />
                  </div>
                  <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                    Titik Lokasi Presensi
                  </h4>
                  <p className="text-xs text-slate-muted mt-1">
                    Kelola master koordinat GPS dan radius jangkauan presensi agenda.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                  Kelola Lokasi{" "}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Menu Khusus Admin: Kelola Periode & Data Admin */}
              {isAdmin && (
                <>
                  <Link
                    href="/dashboard/periode"
                    className="p-5 rounded-3xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-11 h-11 rounded-2xl bg-highlight/20 text-[#B45309] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                        Kelola Periode
                      </h4>
                      <p className="text-xs text-slate-muted mt-1">
                        Buka periode kepengurusan baru atau tutup periode
                        (read-only).
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                      Kelola Periode{" "}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link
                    href="/dashboard/profil"
                    className="p-5 rounded-3xl bg-white border border-[#E2E8F0] hover:border-secondary transition-all shadow-sm hover:shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-11 h-11 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <User className="w-5 h-5 text-secondary" />
                      </div>
                      <h4 className="text-sm font-bold text-navy group-hover:text-secondary transition-colors">
                        Data Admin
                      </h4>
                      <p className="text-xs text-slate-muted mt-1">
                        Kelola data kredensial, peran kepengurusan, dan hak akses akun administrator.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary">
                      Kelola Admin{" "}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Khusus Admin: Card Top 3 Poin Kehadiran */}
        {isAdmin && (
          <aside className="lg:col-span-4">
            <div className="flex h-full flex-col rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight/15">
                    <Trophy className="h-4 w-4 text-[#B45309]" />
                  </span>
                  Top 3 Poin Kehadiran
                </h3>
                <p className="mt-1 text-xs text-slate-muted">
                  {periodeNamaRekap
                    ? `${periodeNamaRekap}${bulanLabelRekap ? ` • ${bulanLabelRekap}` : ""}`
                    : "Belum ada periode aktif"}
                </p>
              </div>

              {topPoin.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-muted">
                  Belum ada sesi presensi yang selesai pada periode ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {topPoin.map((b) => {
                    const gayaPeringkat =
                      [
                        "border-highlight/50 bg-highlight/10",
                        "border-[#E2E8F0] bg-white",
                        "border-accent/30 bg-accent/10",
                      ][b.peringkat - 1] ?? "border-[#E2E8F0] bg-white";
                    const warnaMedali =
                      ["bg-highlight/25", "bg-surface", "bg-accent/20"][
                        b.peringkat - 1
                      ] ?? "bg-surface";

                    return (
                      <div
                        key={b.stoId}
                        className={`flex items-center gap-3 rounded-2xl border p-3 ${gayaPeringkat}`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${warnaMedali}`}
                        >
                          {["🥇", "🥈", "🥉"][b.peringkat - 1] ??
                            `#${b.peringkat}`}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-navy">
                            {b.nama}
                          </p>
                          <p className="truncate text-[11px] text-slate-muted">
                            {b.divisi ?? "Umum"}
                          </p>
                          <p className="text-[10px] text-slate-muted">
                            Peringkat #{b.peringkat} • {b.nim}
                          </p>
                        </div>
                        <span
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                            b.peringkat === 1
                              ? "bg-highlight/20 text-[#B45309]"
                              : b.peringkat === 2
                                ? "bg-surface text-navy"
                                : "bg-surface text-slate-muted"
                          }`}
                        >
                          {b.poin} poin
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link
                href="/dashboard/leaderboard"
                className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-secondary transition-colors hover:text-primary"
              >
                Lihat leaderboard lengkap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
