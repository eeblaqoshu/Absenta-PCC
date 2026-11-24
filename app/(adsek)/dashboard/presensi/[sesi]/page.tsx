// app/(adsek)/dashboard/presensi/[sesi]/page.tsx
// Layar sesi presensi: proyektor QR dinamis + daftar hadir langsung + TTD otomatis.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rekapKehadiranSesi } from "@/lib/kehadiran";
import { LayarQr } from "@/components/dashboard/layar-qr";
import { DaftarKehadiran } from "@/components/dashboard/daftar-kehadiran";
import { formatJamIndo, hitungStatusSesi } from "@/lib/waktu";
import { StatusPeriode } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, QrCode } from "lucide-react";

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
              periode: { select: { nama: true, status: true } },
            },
          },
        },
      },
    },
  });

  if (!data) notFound();

  const isReadonly = data.agenda.proker.periode.status === StatusPeriode.selesai;

  // Sertakan TTD digital STO agar langsung tampil otomatis saat peserta hadir.
  const rekap = await rekapKehadiranSesi(data.id, new Date(), {
    sertakanTtd: true,
  });

  const statusSesi = hitungStatusSesi(data.bukaAt, data.tutupAt);

  return (
    <div className="py-2 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/proker/${data.agenda.proker.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke {data.agenda.proker.nama}
          </Link>
          <span className="text-xs text-slate-muted">•</span>
          <span className="text-xs font-semibold text-secondary">
            {data.agenda.proker.periode.nama}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-muted">
          <Clock className="w-3.5 h-3.5 text-secondary" />
          Sesi #{data.id} • {formatJamIndo(data.bukaAt)} – {formatJamIndo(data.tutupAt)}
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
        <div className="flex items-start gap-3 rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface">
            <QrCode className="w-5 h-5 text-slate-muted" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">
              {statusSesi === "belum_dibuka"
                ? "Sesi belum dibuka"
                : "Sesi sudah selesai"}
            </p>
            <p className="text-xs text-slate-muted leading-relaxed">
              {statusSesi === "belum_dibuka"
                ? `QR baru tampil pada ${formatJamIndo(data.bukaAt)}.`
                : "QR sudah tidak ditampilkan lagi. Anda tetap dapat mengelola daftar hadir, melihat lampiran TTD otomatis, atau melakukan Export PDF di bawah."}
            </p>
          </div>
        </div>
      )}

      {rekap && (
        <DaftarKehadiran sesiId={data.id} isReadonly={isReadonly} rekap={rekap} />
      )}
    </div>
  );
}
