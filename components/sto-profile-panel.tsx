import Image from "next/image";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";

interface StoProfilePanelProps {
  nama: string;
  nim: string;
  jabatan: string | null;
  divisi: string | null;
  foto: string | null;
  inisial: string;
  hadir: number;
  terlambat: number;
  sudahPresensiBerjalan: boolean;
}

export function StoProfilePanel({
  nama,
  nim,
  jabatan,
  divisi,
  foto,
  inisial,
  hadir,
  terlambat,
  sudahPresensiBerjalan,
}: StoProfilePanelProps) {
  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/8 text-sm font-semibold text-primary">
            {foto ? (
              <Image src={foto} alt={nama} fill sizes="48px" className="object-cover" />
            ) : (
              inisial || "STO"
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-navy">{nama}</h2>
            <p className="mt-0.5 text-xs text-slate-muted">{nim}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E2E8F0] pt-4 text-xs">
          <div className="min-w-0">
            <dt className="text-slate-muted">Jabatan</dt>
            <dd className="mt-1 truncate font-medium text-navy">{jabatan ?? "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-slate-muted">Divisi</dt>
            <dd className="mt-1 truncate font-medium text-navy">{divisi ?? "—"}</dd>
          </div>
        </dl>

        <Link
          href="/profil"
          className="mt-4 inline-flex text-xs font-medium text-secondary hover:text-primary"
        >
          Lihat profil
        </Link>
      </section>

      <Link
        href="/scan"
        className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary"
      >
        {sudahPresensiBerjalan ? "Lihat presensi" : "Scan presensi"}
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Tepat waktu" value={hadir} />
        <StatCard label="Terlambat" value={terlambat} />
      </div>
    </aside>
  );
}
