// app/(adsek)/dashboard/proker/[id]/agenda/[agendaId]/edit/page.tsx
// Halaman pengubahan agenda kegiatan yang sudah ada.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AgendaFormPage } from "@/components/dashboard/proker";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string; agendaId: string }>;
}

export default async function HalamanEditAgenda({ params }: PageProps) {
  await requireAdsek();

  const { id, agendaId: rawAgendaId } = await params;
  const prokerId = parseInt(id, 10);
  const agendaId = parseInt(rawAgendaId, 10);

  if (isNaN(prokerId) || isNaN(agendaId)) {
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

  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaId },
  });

  if (!agenda || agenda.prokerId !== prokerId) {
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
        agendaAwal={{
          ...agenda,
          lat: agenda.lat ? Number(agenda.lat) : null,
          lng: agenda.lng ? Number(agenda.lng) : null,
        }}
      />
    </div>
  );
}
