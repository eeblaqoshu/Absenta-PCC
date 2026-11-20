// app/api/presensi/export/route.ts
// Ekspor CSV daftar kehadiran satu sesi presensi (hanya adsek).
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rekapKehadiranSesi, type StatusKehadiran } from "@/lib/kehadiran";

const LABEL_KEHADIRAN: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin",
  izin_menunggu: "Izin",
  alpa: "Alpa",
  ditolak: "Ditolak",
};

/** Bungkus nilai agar aman di dalam CSV. */
function sel(nilai: string | number | null | undefined): string {
  const teks = nilai === null || nilai === undefined ? "" : String(nilai);
  return `"${teks.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "adsek" || !session.adsek) {
    return NextResponse.json(
      { error: { kode: "AKSES_DITOLAK", pesan: "Hanya adsek yang dapat mengekspor data kehadiran" } },
      { status: 403 }
    );
  }

  const sesiId = Number(req.nextUrl.searchParams.get("sesiId"));
  if (!Number.isInteger(sesiId) || sesiId <= 0) {
    return NextResponse.json(
      { error: { kode: "VALIDASI_GAGAL", pesan: "Parameter sesiId tidak valid" } },
      { status: 400 }
    );
  }

  const sesi = await prisma.sesiPresensi.findUnique({
    where: { id: sesiId },
    select: { agendaId: true },
  });
  if (!sesi) {
    return NextResponse.json(
      { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi presensi tidak ditemukan" } },
      { status: 404 }
    );
  }

  const rekap = await rekapKehadiranSesi(sesiId);
  if (!rekap) {
    return NextResponse.json(
      { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi presensi tidak ditemukan" } },
      { status: 404 }
    );
  }

  const baris: string[] = [
    [
      "Nama",
      "NIM",
      "Divisi",
      "Status Kehadiran",
      "Menit Terlambat",
      "Jarak (m)",
      "Di Luar Radius",
      "Verifikasi",
      "Jenis Izin",
      "Status Izin",
      "Poin",
      "Diinput Manual",
    ]
      .map(sel)
      .join(","),
  ];

  for (const b of rekap.baris) {
    baris.push(
      [
        b.nama,
        b.nim,
        b.divisi,
        LABEL_KEHADIRAN[b.statusKehadiran],
        b.presensiId ? b.menitTerlambat : "",
        b.jarakM ?? "",
        b.diLuarRadius ? "Ya" : "Tidak",
        b.statusVerifikasi ?? "",
        b.izin?.jenis ?? "",
        b.izin?.status ?? "",
        rekap.sesiSudahDitutup ? b.poin : "",
        b.manual ? "Ya" : "Tidak",
      ]
        .map(sel)
        .join(",")
    );
  }

  const csv = "\uFEFF" + baris.join("\r\n"); // BOM supaya Excel membaca UTF-8
  const namaFile = `kehadiran-sesi${sesiId}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
