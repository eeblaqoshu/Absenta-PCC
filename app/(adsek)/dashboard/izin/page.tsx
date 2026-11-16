// app/(adsek)/dashboard/izin/page.tsx
// Peninjauan izin STO (adsek) pada periode aktif.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IzinManager, type BarisIzin } from "@/components/dashboard/izin-manager";
import { formatJamIndo, formatTanggalIndo } from "@/lib/waktu";
import { StatusPeriode } from "@prisma/client";
import { AlertCircle } from "lucide-react";

export default async function IzinAdsekPage() {
  await requireAdsek();

  const periodeAktif = await prisma.periode.findFirst({
    where: { status: StatusPeriode.aktif },
  });

  if (!periodeAktif) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-3 max-w-lg mx-auto my-8">
        <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Tidak Ada Periode Aktif</h2>
        <p className="text-xs text-zinc-500">
          Izin hanya bisa ditinjau ketika ada periode kepengurusan aktif.
        </p>
      </div>
    );
  }

  const izin = await prisma.izin.findMany({
    where: { sesi: { agenda: { proker: { periodeId: periodeAktif.id } } } },
    include: {
      sto: { select: { nama: true, nim: true, divisi: true } },
      peninjau: { select: { nama: true } },
      sesi: {
        select: {
          bukaAt: true,
          tutupAt: true,
          agenda: {
            select: {
              judul: true,
              proker: { select: { nama: true } },
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const daftar: BarisIzin[] = izin.map((i) => ({
    id: i.id,
    jenis: i.jenis,
    status: i.status,
    alasan: i.alasan,
    createdAt: i.createdAt.toISOString(),
    ditinjauAt: i.ditinjauAt ? i.ditinjauAt.toISOString() : null,
    namaPeninjau: i.peninjau?.nama ?? null,
    sto: { nama: i.sto.nama, nim: i.sto.nim, divisi: i.sto.divisi },
    sesi: {
      judul: i.sesi.agenda.judul,
      namaProker: i.sesi.agenda.proker.nama,
      jadwal: `${formatTanggalIndo(i.sesi.bukaAt)} • ${formatJamIndo(i.sesi.bukaAt)}–${formatJamIndo(
        i.sesi.tutupAt
      )} WIB`,
    },
  }));

  return (
    <div className="py-2">
      <IzinManager daftar={daftar} />
    </div>
  );
}
