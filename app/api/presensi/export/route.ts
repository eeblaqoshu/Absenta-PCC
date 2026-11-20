// app/api/presensi/export/route.ts
// Ekspor CSV daftar kehadiran satu sesi presensi (hanya adsek).
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rekapKehadiranSesi, type StatusKehadiran } from "@/lib/kehadiran";

const LABEL_STATUS_KEHADIRAN: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin",
  izin_menunggu: "Izin",
  alpa: "Alpa",
  ditolak: "Ditolak",
};

/** 
 * Bungkus nilai agar aman di dalam format CSV (RFC 4180)
 * dan netralkan karakter pemicu CSV/Formula Injection (CWE-1236).
 */
function sel(nilai: string | number | null | undefined): string {
  let teks = nilai === null || nilai === undefined ? "" : String(nilai);
  // Netralkan karakter pemicu formula Excel/Spreadsheet (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(teks)) {
    teks = "'" + teks;
  }
  return `"${teks.replace(/"/g, '""')}"`;
}

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
      "Divisi / Departemen",
      "Status Kehadiran",
      "Menit Terlambat",
      "Jarak (m)",
      "Diinput Manual",
    ]
      .map(sel)
      .join(","),
  ];

  for (const b of rekap.baris) {
    // Format menit terlambat
    let menitTerlambatStr = "-";
    if (b.statusKehadiran === "terlambat") {
      menitTerlambatStr = String(b.menitTerlambat);
    } else if (b.statusKehadiran === "hadir") {
      menitTerlambatStr = "0";
    }

    // Format jarak (m)
    const jarakStr =
      b.jarakM !== null && b.jarakM !== undefined ? String(b.jarakM) : "-";

    baris.push(
      [
        b.nama,
        b.divisi || "-",
        LABEL_STATUS_KEHADIRAN[b.statusKehadiran] ?? b.statusKehadiran,
        menitTerlambatStr,
        jarakStr,
        b.manual ? "Ya" : "Tidak",
      ]
        .map(sel)
        .join(",")
    );
  }

  // BOM (\uFEFF) di awal string agar Microsoft Excel membaca format UTF-8 dengan benar
  const csv = "\uFEFF" + baris.join("\r\n");

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
