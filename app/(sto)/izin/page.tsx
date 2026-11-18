// app/(sto)/izin/page.tsx
// Halaman izin STO: daftar SESI presensi yang belum ditutup pada agenda yang menjadi hak STO.
// Izin diajukan per sesi (satu agenda bisa punya beberapa sesi).
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import { formatJamIndo, tanggalWib } from "@/lib/waktu";
import { IzinSto, type SesiIzin } from "@/components/izin-sto";

export default async function IzinPage() {
  const sto = await requireSto();
  const sekarang = new Date();

  // Sesi yang masih bisa diizinkan: belum ditutup (tutup_at > sekarang).
  const agenda = await prisma.agenda.findMany({
    where: {
      proker: { periodeId: sto.periodeId },
      sesi: { some: { tutupAt: { gt: sekarang } } },
    },
    include: {
      proker: { select: { nama: true } },
      sesi: {
        where: { tutupAt: { gt: sekarang } },
        select: { id: true, bukaAt: true, tutupAt: true },
        orderBy: { bukaAt: "asc" },
      },
    },
    orderBy: [{ tglPelaksanaan: "asc" }, { urutan: "asc" }],
  });

  const semuaSesiId = agenda.flatMap((a) => a.sesi.map((s) => s.id));
  const izinMilikSaya =
    semuaSesiId.length > 0
      ? await prisma.izin.findMany({
          where: { stoId: sto.id, sesiId: { in: semuaSesiId } },
        })
      : [];
  const izinPerSesi = new Map(izinMilikSaya.map((i) => [i.sesiId, i]));

  const daftar: SesiIzin[] = [];
  for (const item of agenda) {
    const akses = await bolehAkses(sto.id, item.id);
    if (!akses.boleh) continue;

    for (const sesi of item.sesi) {
      const izin = izinPerSesi.get(sesi.id);
      daftar.push({
        sesiId: sesi.id,
        judul: item.judul,
        namaProker: item.proker.nama,
        tanggal: tanggalWib(sesi.bukaAt),
        jamLabel: `${formatJamIndo(sesi.bukaAt)}–${formatJamIndo(sesi.tutupAt)} WIB`,
        izin: izin
          ? { id: izin.id, jenis: izin.jenis, status: izin.status, alasan: izin.alasan }
          : null,
      });
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-medium text-slate-muted">Pengurus STO</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Pengajuan izin</h1>
        <p className="mt-2 text-xs text-slate-muted">
          Pilih sesi yang belum ditutup untuk mengajukan izin.
        </p>
      </header>
      <IzinSto daftar={daftar} />
    </section>
  );
}