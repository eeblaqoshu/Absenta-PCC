// app/(adsek)/dashboard/izin/page.tsx
// Peninjauan izin STO per agenda pada periode aktif.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IzinManager, type BarisIzin } from "@/components/dashboard/izin-manager";
import { formatTanggalIndo, jamDariWaktuAgenda } from "@/lib/waktu";
import { StatusPeriode } from "@prisma/client";
import { AlertCircle } from "lucide-react";

export default async function IzinAdsekPage() {
  await requireAdsek();

  const periodeAktif = await prisma.periode.findFirst({
    where: { status: StatusPeriode.aktif },
  });

  if (!periodeAktif) {
    return (
      <div className="mx-auto my-8 max-w-lg space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-6 w-6 text-[#B45309]" />
        <h2 className="text-base font-bold text-primary">Tidak Ada Periode Aktif</h2>
        <p className="text-xs text-slate-muted">
          Izin hanya bisa ditinjau ketika ada periode kepengurusan aktif.
        </p>
      </div>
    );
  }

  const izin = await prisma.izin.findMany({
    where: { agenda: { proker: { periodeId: periodeAktif.id } } },
    include: {
      sto: { select: { nama: true, nim: true, divisi: true } },
      peninjau: { select: { nama: true } },
      agenda: {
        select: {
          judul: true,
          tglPelaksanaan: true,
          tglSelesai: true,
          waktuPelaksanaan: true,
          proker: { select: { nama: true } },
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
    agenda: {
      judul: i.agenda.judul,
      namaProker: i.agenda.proker.nama,
      jadwal: `${formatTanggalIndo(i.agenda.tglPelaksanaan)}${
        i.agenda.tglSelesai ? ` – ${formatTanggalIndo(i.agenda.tglSelesai)}` : ""
      } • ${jamDariWaktuAgenda(i.agenda.waktuPelaksanaan)} WIB`,
    },
  }));

  return (
    <div className="py-2">
      <IzinManager daftar={daftar} />
    </div>
  );
}
