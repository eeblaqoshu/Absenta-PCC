// app/(adsek)/dashboard/presensi/[sesi]/page.tsx
// Layar sesi presensi: proyektor QR dinamis + daftar hadir langsung.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rekapKehadiranSesi } from "@/lib/kehadiran";
import { LayarQr } from "@/components/dashboard/layar-qr";
import { DaftarKehadiran } from "@/components/dashboard/daftar-kehadiran";
import { formatJamIndo, hitungStatusSesi } from "@/lib/waktu";
import { StatusPeriode } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, QrCode, Users } from "lucide-react";

interface PageProps {
  params: Promise<{ sesi: string }>;
}

export default async function PresensiSesiPage({ params }: PageProps) {
  await requireAdsek();

  const { sesi } = await params;
  const sesiId = parseInt(sesi, 10);
  if (Number.isNaN(sesiId)) notFound();

  const data = await prisma.sesiPresensi.findUnique({
    where: { id: sesiId },
    include: {
      agenda: {
        select: {
          id: true,
          judul: true,
          lokasiNama: true,
          proker: {
            select: {
              id: true,
              nama: true,
              periode: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  if (!data) notFound();

  const isReadonly = data.agenda.proker.periode.status === StatusPeriode.selesai;

  // Rekap dihitung per sesi (satu agenda boleh punya beberapa sesi).
  const rekap = await rekapKehadiranSesi(data.id);

  const statusSesi = hitungStatusSesi(data.bukaAt, data.tutupAt);

  return (
    <div className="py-2 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/proker/${data.agenda.proker.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke {data.agenda.proker.nama}
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          Sesi #{data.id} • {formatJamIndo(data.bukaAt)}–{formatJamIndo(data.tutupAt)} WIB
        </span>
      </div>

      {statusSesi === "berjalan" ? (
        <LayarQr
          sesiId={data.id}
          judulAgenda={data.agenda.judul}
          namaProker={data.agenda.proker.nama}
          lokasiNama={data.agenda.lokasiNama}
          isReadonly={isReadonly}
        />
      ) : (
        <div className="p-5 rounded-3xl bg-white dark:bg-[#121212] border border-zinc-200/80 dark:border-zinc-800/80 flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-zinc-400" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {statusSesi === "belum_dibuka"
                ? "Sesi belum dibuka"
                : "Sesi sudah selesai"}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {statusSesi === "belum_dibuka"
                ? `QR baru tampil pada ${formatJamIndo(data.bukaAt)} WIB.`
                : "QR sudah tidak ditampilkan lagi. Anda tetap dapat melihat dan mengelola daftar hadir serta mengekspor CSV di bawah."}
            </p>
          </div>
        </div>
      )}

      {rekap && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Daftar hadir & kelola kehadiran
          </h2>
          <DaftarKehadiran sesiId={data.id} isReadonly={isReadonly} rekap={rekap} />
        </div>
      )}
    </div>
  );
}
