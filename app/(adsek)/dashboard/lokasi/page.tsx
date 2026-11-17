// app/(adsek)/dashboard/lokasi/page.tsx
// Master lokasi presensi (admin only). Dipakai ulang saat membuat sesi presensi.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LokasiManager } from "@/components/dashboard/lokasi-manager";

export default async function LokasiPage() {
  await requireAdsek(["admin"]);

  const daftar = await prisma.lokasi.findMany({ orderBy: { nama: "asc" } });

  return (
    <div className="py-2">
      <LokasiManager
        initialLokasi={daftar.map((l) => ({
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
