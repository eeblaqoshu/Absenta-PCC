// app/(sto)/izin/page.tsx
// Halaman izin STO: daftar SESI presensi yang belum ditutup pada agenda yang menjadi hak STO.
// Izin diajukan per sesi (satu agenda bisa punya beberapa sesi).
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import { formatJamIndo, tanggalWib } from "@/lib/waktu";
import { IzinSto, type SesiIzin } from "@/components/izin-sto";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

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
            <FileText className="w-5 h-5 text-blue-500" />
            Izin Tidak Hadir
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Ajukan izin per <strong className="font-semibold">sesi presensi</strong>. Izin yang
            disetujui adsek membuat poin sesi itu menjadi 0 (tidak mengurangi poin) walau Anda tidak
            hadir atau datang terlambat.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Hanya sesi yang <strong className="font-semibold">belum ditutup</strong> yang tampil di
            sini; sesi yang sudah lewat tidak bisa diajukan izin.
          </p>
        </div>

        <IzinSto daftar={daftar} />
      </main>
    </div>
  );
}
