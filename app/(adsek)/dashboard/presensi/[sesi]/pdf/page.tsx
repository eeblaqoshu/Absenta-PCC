// app/(adsek)/dashboard/presensi/[sesi]/pdf/page.tsx
// Halaman Export PDF Daftar Hadir sesuai agenda.
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rekapKehadiranSesi } from "@/lib/kehadiran";
import { formatTanggalIndo } from "@/lib/waktu";
import {
  ExportPdfDaftarHadir,
  type PenandatanganDaftarHadir,
} from "@/components/dashboard/presensi";
import { JenisAgenda, PeranPanitia, TargetPeserta } from "@prisma/client";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ sesi: string }>;
}

function formatRentangJamTitikWib(buka: Date, tutup: Date): string {
  const fmt = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const h = parts.find((p) => p.type === "hour")?.value ?? "00";
    const m = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${h}.${m}`;
  };
  return `${fmt(buka)} – ${fmt(tutup)} WIB`;
}

function tentukanSubjudulDefault(target: TargetPeserta): string {
  switch (target) {
    case TargetPeserta.semua_panitia:
      return "PANITIA OFFLINE";
    case TargetPeserta.hanya_pj_pi:
      return "PJ & PIMPINAN INTI OFFLINE";
    case TargetPeserta.semua_panitia_sto:
      return "PENGURUS & PANITIA OFFLINE";
  }
}

function tentukanNamaAcaraDefault(
  jenis: JenisAgenda,
  judulAgenda: string,
  namaProker: string,
): string {
  const j = judulAgenda.trim();
  const p = namaProker.trim();
  if (jenis === JenisAgenda.hari_h) {
    if (!j || /^hari[\s-]*h\b/i.test(j)) {
      return p;
    }
    return j.toLowerCase().includes(p.toLowerCase()) ? j : `${p} – ${j}`;
  }
  return j.toLowerCase().includes(p.toLowerCase()) ? j : `${j} – ${p}`;
}

export default async function ExportPdfPresensiPage({ params }: PageProps) {
  const adsek = await requireAdsek();

  const { sesi } = await params;
  const sesiId = parseInt(sesi, 10);
  if (Number.isNaN(sesiId)) notFound();

  const rekap = await rekapKehadiranSesi(sesiId, new Date(), {
    sertakanTtd: true,
  });
  if (!rekap) notFound();

  // Cari Ketua Pelaksana dari kepanitiaan proker untuk blok tanda tangan bawah
  const daftarKetua = await prisma.kepanitiaan.findMany({
    where: {
      prokerId: rekap.namaProkerId,
      peran: PeranPanitia.ketua,
    },
    include: {
      sto: {
        select: { nama: true, nim: true, ttd: true },
      },
    },
    orderBy: { id: "asc" },
  });

  const ketuaPelaksana =
    daftarKetua.find(
      (k) => !(k.divisiPanitia || "").toLowerCase().includes("wakil"),
    ) ?? daftarKetua[0];

  let penandatanganDefault: PenandatanganDaftarHadir;
  if (ketuaPelaksana) {
    penandatanganDefault = {
      jabatan: "Ketua Pelaksana",
      nama: ketuaPelaksana.sto.nama,
      nim: ketuaPelaksana.sto.nim,
      ttd: ketuaPelaksana.sto.ttd,
    };
  } else {
    penandatanganDefault = {
      jabatan: "Sekretaris",
      nama: adsek.nama,
      nim: "",
      ttd: null,
    };
  }

  const bukaDate = new Date(rekap.bukaAt);
  const tutupDate = new Date(rekap.tutupAt);

  return (
    <div className="py-2 print:py-0">
      <ExportPdfDaftarHadir
        rekap={rekap}
        hariTanggalLabel={formatTanggalIndo(bukaDate)}
        waktuSesiLabel={formatRentangJamTitikWib(bukaDate, tutupDate)}
        acaraDefault={tentukanNamaAcaraDefault(
          rekap.jenisAgenda,
          rekap.judulAgenda,
          rekap.namaProker,
        )}
        subjudulDefault={tentukanSubjudulDefault(rekap.targetPeserta)}
        penandatanganDefault={penandatanganDefault}
        isAdmin={adsek.role === "admin"}
      />
    </div>
  );
}
