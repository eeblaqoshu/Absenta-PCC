// app/(adsek)/dashboard/page.tsx
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPeriode } from "@prisma/client";
import Link from "next/link";
import { hitungLeaderboard } from "@/lib/rekap-poin";
import { StatCard } from "@/components/ui/stat-card";

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

  const adminLinks = adsek.role === "admin"
    ? [
        { href: "/dashboard/sto", label: "Data STO" },
        { href: "/dashboard/periode", label: "Periode" },
        { href: "/dashboard/lokasi", label: "Lokasi" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium capitalize text-slate-muted">
            {adsek.role.replaceAll("_", " ")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            {periodeAktif?.nama ?? "Ringkasan"}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${periodeAktif ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {periodeAktif ? "Periode aktif" : "Belum ada periode aktif"}
        </span>
      </header>

      <section aria-label="Statistik periode" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Pengurus STO" value={totalSto} />
        <StatCard label="Program kerja" value={totalProker} />
        <StatCard label="Agenda" value={totalAgenda} />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-8">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-navy">Periode kepengurusan</h2>
            {periodeAktif ? (
              <p className="mt-2 text-xs text-slate-muted">
                {new Date(periodeAktif.tglMulai).toLocaleDateString("id-ID")} – {new Date(periodeAktif.tglSelesai).toLocaleDateString("id-ID")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-muted">
                Periode aktif belum tersedia.
                {adsek.role === "admin" && (
                  <> Buka periode melalui <Link href="/dashboard/periode" className="font-medium text-secondary hover:text-primary">menu Periode</Link>.</>
                )}
              </p>
            )}
          </div>

          {adminLinks.length > 0 && (
            <section className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-navy">Administrasi</h2>
              <div className="mt-3 divide-y divide-[#E2E8F0]">
                {adminLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-slate-muted transition-colors hover:text-primary"
                  >
                    {item.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 lg:col-span-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-navy">Poin kehadiran</h2>
            <Link href="/dashboard/leaderboard" className="text-xs font-medium text-secondary hover:text-primary">
              Semua
            </Link>
          </div>
          <p className="mt-1 text-xs text-slate-muted">{rekapPoin?.totalSesiDihitung ?? 0} sesi ditutup</p>

          {topPoin.length === 0 ? (
            <p className="mt-5 text-xs text-slate-muted">Belum ada sesi yang selesai dihitung.</p>
          ) : (
            <ol className="mt-4 divide-y divide-[#E2E8F0]">
              {topPoin.map((baris) => (
                <li key={baris.stoId} className="flex items-center gap-3 py-3">
                  <span className="w-5 shrink-0 text-xs text-slate-muted">{baris.peringkat}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-navy">{baris.nama}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-muted">{baris.divisi ?? "Umum"}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-navy">{baris.poin}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}