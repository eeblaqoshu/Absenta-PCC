// app/(sto)/scan/page.tsx
// Halaman scan presensi STO: daftar sesi yang sedang dibuka + peta radius + kamera QR.
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import { ScanPresensi, type SesiTersedia } from "@/components/scan-presensi";
import { LogoutButton } from "@/components/ui/logout-button";
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
    <div className="min-h-screen bg-surface font-sans text-primary">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs font-bold text-navy">
              {sto.nama}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 text-secondary" />
            <span className="text-xs font-semibold text-slate-muted">
              Portal Kehadiran Pengurus STO
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            Scan Presensi
          </h1>
          <p className="text-xs text-slate-muted mt-1 leading-relaxed">
            Pastikan Anda berada di dalam radius lokasi kegiatan dan sesi presensi masih berstatus dibuka.
          </p>
        </div>

        <ScanPresensi daftarSesi={daftarSesi} />
      </main>
    </div>
  );
}
