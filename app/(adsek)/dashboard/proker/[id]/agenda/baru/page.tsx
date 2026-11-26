// app/(adsek)/dashboard/proker/[id]/agenda/baru/page.tsx
// Halaman pembuatan agenda kegiatan baru di bawah program kerja tertentu.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgendaFormPage } from "@/components/dashboard/proker";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HalamanTambahAgenda({ params }: PageProps) {
  await requireAdsek();

  const { id } = await params;
  const prokerId = parseInt(id, 10);

  if (isNaN(prokerId)) {
    notFound();
  }

  const proker = await prisma.proker.findUnique({
    where: { id: prokerId },
    select: {
      id: true,
      nama: true,
      periode: {
        select: {
          id: true,
          nama: true,
          status: true,
        },
      },
    },
  });

  if (!proker) {
    notFound();
  }

  const daftarLokasi = await prisma.lokasi.findMany({
    select: {
      id: true,
      nama: true,
      lat: true,
      lng: true,
      radiusM: true,
    },
    orderBy: { nama: "asc" },
  });

  return (
    <div className="py-2">
      <AgendaFormPage
        proker={proker}
        daftarLokasi={daftarLokasi.map((l) => ({
          ...l,
          lat: l.lat ? Number(l.lat) : null,
          lng: l.lng ? Number(l.lng) : null,
        }))}
      />
    </div>
  );
}
