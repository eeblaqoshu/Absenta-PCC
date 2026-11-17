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
    <div className="min-h-screen bg-surface font-sans text-navy">
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-bold text-navy sm:block">{sto.nama}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-secondary" />
            <span className="text-xs font-semibold text-slate-muted">
              Pengajuan Perizinan STO
            </span>
          </div>
          <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
            Izin Tidak Hadir
          </h1>
          <p className="mt-1.5 text-xs text-slate-muted leading-relaxed">
            Ajukan izin per <strong className="font-semibold text-navy">sesi presensi</strong>. Izin
            yang disetujui adsek membuat poin sesi itu menjadi 0 (tidak mengurangi poin) walau Anda
            tidak hadir atau datang terlambat.
          </p>
          <p className="mt-1 text-xs text-slate-muted">
            Hanya sesi yang <strong className="font-semibold text-navy">belum ditutup</strong> yang
            tampil di sini; sesi yang sudah lewat tidak bisa diajukan izin.
          </p>
        </div>

        <IzinSto daftar={daftar} />
      </main>
    </div>
  );
}
