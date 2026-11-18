// app/(sto)/scan/page.tsx
// Halaman scan presensi STO: daftar sesi yang sedang dibuka + peta radius + kamera QR.
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import { ScanPresensi, type SesiTersedia } from "@/components/scan-presensi";

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
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-medium text-slate-muted">Pengurus STO</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Scan presensi</h1>
        <p className="mt-2 text-xs text-slate-muted">
          Presensi di luar radius tetap tercatat dan menunggu verifikasi adsek.
        </p>
      </header>
      <ScanPresensi daftarSesi={daftarSesi} />
    </section>
  );
}