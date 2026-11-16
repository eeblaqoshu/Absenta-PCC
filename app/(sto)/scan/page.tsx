// app/(sto)/scan/page.tsx
// Halaman scan presensi STO: daftar sesi yang sedang dibuka + peta radius + kamera QR.
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import { ScanPresensi, type SesiTersedia } from "@/components/scan-presensi";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";

export default async function ScanPage() {
  const sto = await requireSto();
  const sekarang = new Date();

  // Ambil agenda pada periode STO yang punya sesi sedang dibuka.
  const agendaDenganSesi = await prisma.agenda.findMany({
    where: {
      proker: { periodeId: sto.periodeId },
      sesi: { some: { bukaAt: { lte: sekarang }, tutupAt: { gte: sekarang } } },
    },
    include: {
      proker: { select: { nama: true } },
      sesi: {
        where: { bukaAt: { lte: sekarang }, tutupAt: { gte: sekarang } },
        orderBy: { bukaAt: "asc" },
      },
    },
    orderBy: { urutan: "asc" },
  });

  // Saring hanya agenda yang menjadi hak STO ini (aturan target_peserta).
  // Sekaligus ambil presensi STO pada tiap sesi supaya halaman bisa langsung
  // menampilkan status "sudah presensi" alih-alih scanner.
  const daftarSesi: SesiTersedia[] = [];
  for (const agenda of agendaDenganSesi) {
    const akses = await bolehAkses(sto.id, agenda.id);
    if (!akses.boleh) continue;

    for (const sesi of agenda.sesi) {
      if (agenda.lat === null || agenda.lng === null) continue;

      const presensi = await prisma.presensi.findUnique({
        where: { sesiId_stoId: { sesiId: sesi.id, stoId: sto.id } },
        select: {
          status: true,
          waktuScan: true,
          jarakM: true,
          diLuarRadius: true,
          statusVerifikasi: true,
        },
      });

      daftarSesi.push({
        sesiId: sesi.id,
        agendaId: agenda.id,
        judulAgenda: agenda.judul,
        namaProker: agenda.proker.nama,
        lokasiNama: agenda.lokasiNama ?? null,
        lat: agenda.lat === null ? 0 : Number(agenda.lat),
        lng: agenda.lng === null ? 0 : Number(agenda.lng),
        radiusM: agenda.radiusM ?? 500,
        bukaAt: sesi.bukaAt.toISOString(),
        tutupAt: sesi.tutupAt.toISOString(),
        presensi: presensi
          ? {
              status: presensi.status,
              waktuScan: presensi.waktuScan.toISOString(),
              jarakM: presensi.jarakM,
              diLuarRadius: presensi.diLuarRadius,
              statusVerifikasi: presensi.statusVerifikasi,
            }
          : null,
      });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {sto.nama}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-lg font-bold inline-flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            Scan Presensi
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Presensi di luar radius tetap tercatat dan akan diverifikasi adsek. Waktu sesi tetap
            harus masih dibuka.
          </p>
        </div>

        <ScanPresensi daftarSesi={daftarSesi} />
      </main>
    </div>
  );
}
