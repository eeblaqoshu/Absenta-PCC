// app/(adsek)/dashboard/proker/[id]/panitia/page.tsx
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KelolaPanitiaPage } from "@/components/dashboard/proker-detail/kelola-panitia-page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HalamanKelolaPanitia({ params }: PageProps) {
  await requireAdsek();

  const { id } = await params;
  const prokerId = parseInt(id, 10);

  if (isNaN(prokerId)) {
    notFound();
  }

  const proker = await prisma.proker.findUnique({
    where: { id: prokerId },
    include: {
      periode: {
        select: {
          id: true,
          nama: true,
          status: true,
        },
      },
      kepanitiaan: {
        include: {
          sto: {
            select: {
              id: true,
              nama: true,
              nim: true,
              emailGoogle: true,
              jabatan: true,
              divisi: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      },
      agenda: {
        select: {
          id: true,
          jenis: true,
          judul: true,
          urutan: true,
          tglPelaksanaan: true,
          tglSelesai: true,
          waktuPelaksanaan: true,
          lokasiNama: true,
          lokasiId: true,
          lat: true,
          lng: true,
          radiusM: true,
          targetPeserta: true,
          sesi: {
            select: {
              id: true,
              bukaAt: true,
              tutupAt: true,
            },
          },
        },
      },
    },
  });

  if (!proker) {
    notFound();
  }

  const availableStos = await prisma.sto.findMany({
    where: { periodeId: proker.periode.id },
    select: {
      id: true,
      nama: true,
      nim: true,
      emailGoogle: true,
      jabatan: true,
      divisi: true,
    },
    orderBy: { nama: "asc" },
  });

  return (
    <div className="py-2">
      <KelolaPanitiaPage
        proker={{
          ...proker,
          agenda: proker.agenda.map((ag) => ({
            ...ag,
            lat: ag.lat ? Number(ag.lat) : null,
            lng: ag.lng ? Number(ag.lng) : null,
            statusDihitung: "akan_datang" as const,
          })),
        }}
        availableStos={availableStos}
      />
    </div>
  );
}
