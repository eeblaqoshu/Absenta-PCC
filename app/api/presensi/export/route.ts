// app/api/presensi/export/route.ts
// Ekspor CSV daftar kehadiran satu sesi presensi (hanya adsek).
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rekapKehadiranSesi } from "@/lib/kehadiran";
import { susunCsvKehadiran } from "@/lib/csv-presensi";

/** Membersihkan string agar aman sebagai nama file */
function sanitasiNamaFile(teks: string): string {
  return teks
    .replace(/[^\w\d\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .substring(0, 30);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "adsek" || !session.adsek) {
    return NextResponse.json(
      {
        error: {
          kode: "AKSES_DITOLAK",
          pesan: "Hanya adsek yang dapat mengekspor data kehadiran",
        },
      },
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

  const rekap = await rekapKehadiranSesi(sesiId, new Date(), {
    sertakanTtd: true,
  });
  if (!rekap) {
    return NextResponse.json(
      { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi presensi tidak ditemukan" } },
      { status: 404 }
    );
  }

  const csv = susunCsvKehadiran(rekap);

  const prokerSlug = sanitasiNamaFile(rekap.namaProker);
  const agendaSlug = sanitasiNamaFile(rekap.judulAgenda);
  const namaFile = `kehadiran_${prokerSlug}_${agendaSlug}_sesi${sesiId}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
