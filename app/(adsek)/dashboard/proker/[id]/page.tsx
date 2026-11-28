// app/(adsek)/dashboard/proker/[id]/page.tsx
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProkerDetail } from "@/components/dashboard/proker";
import { rekapKehadiranBanyakSesi } from "@/lib/kehadiran";
import { hitungStatusAgenda } from "@/lib/waktu";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProkerDetailPage({ params }: PageProps) {
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
        include: {
          sesi: {
            select: {
              id: true,
              bukaAt: true,
              tutupAt: true,
            },
            orderBy: { bukaAt: "asc" },
          },
        },
        orderBy: {
          urutan: "asc",
        },
      },
    },
  });

  if (!proker) {
    notFound();
  }

  // Ambil semua daftar STO pada periode proker ini untuk penambahan panitia
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

  const adsekList = await prisma.akunAdsek.findMany({
    select: { email: true, role: true },
  });
  const adsekRoleMap = new Map(
    adsekList.map((a) => [a.email.toLowerCase(), a.role]),
  );

  const availableStosWithRole = availableStos.map((s) => ({
    ...s,
    roleAdsek: s.emailGoogle
      ? adsekRoleMap.get(s.emailGoogle.toLowerCase()) || null
      : null,
  }));

  // Daftar master lokasi untuk pilihan titik presensi agenda
  const daftarLokasi = await prisma.lokasi.findMany({
    select: { id: true, nama: true, lat: true, lng: true, radiusM: true },
    orderBy: { nama: "asc" },
  });

  // Rekap kehadiran tiap SESI (satu agenda bisa punya beberapa sesi) untuk kartu agenda.
  const sekarang = new Date();
  const semuaSesiId = proker.agenda.flatMap((a) => a.sesi.map((s) => s.id));
  const rekapMap = await rekapKehadiranBanyakSesi(semuaSesiId, sekarang);

  return (
    <div className="py-2">
      <ProkerDetail
        initialNowIso={sekarang.toISOString()}
        proker={{
          ...proker,
          agenda: proker.agenda.map((a) => ({
            ...a,
            lat: a.lat === null ? null : Number(a.lat),
            lng: a.lng === null ? null : Number(a.lng),
            statusDihitung: hitungStatusAgenda(
              a.tglPelaksanaan,
              a.waktuPelaksanaan,
              a.tglSelesai,
              sekarang,
            ),
          })),
        }}
        availableStos={availableStosWithRole}
        rekap={Object.fromEntries(rekapMap)}
        daftarLokasi={daftarLokasi.map((l) => ({
          id: l.id,
          nama: l.nama,
          lat: Number(l.lat),
          lng: Number(l.lng),
          radiusM: l.radiusM,
        }))}
      />
    </div>
  );
}
