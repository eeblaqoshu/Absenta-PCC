// app/api/presensi/qr-token/route.ts
// Menghasilkan token QR dinamis untuk sesi presensi. Hanya adsek yang boleh memanggil.
// `qr_secret` tidak pernah dikirim ke klien; klien hanya menerima string QR siap tampil.
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQrToken, getWindowNumber, susunPayloadQr } from "@/lib/qr-token";
import { QR_WINDOW_SECONDS } from "@/lib/konstanta";
import { hitungStatusSesi } from "@/lib/waktu";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "adsek" || !session.adsek) {
    return NextResponse.json(
      { error: { kode: "AKSES_DITOLAK", pesan: "Hanya adsek yang dapat menampilkan QR presensi" } },
      { status: 403 }
    );
  }

  const sesiIdParam = req.nextUrl.searchParams.get("sesiId");
  const sesiId = Number(sesiIdParam);
  if (!Number.isInteger(sesiId) || sesiId <= 0) {
    return NextResponse.json(
      { error: { kode: "VALIDASI_GAGAL", pesan: "Parameter sesiId tidak valid" } },
      { status: 400 }
    );
  }

  const sesi = await prisma.sesiPresensi.findUnique({
    where: { id: sesiId },
    select: {
      id: true,
      bukaAt: true,
      tutupAt: true,
      qrSecret: true,
      agenda: { select: { judul: true, radiusM: true } },
    },
  });

  if (!sesi) {
    return NextResponse.json(
      { error: { kode: "TIDAK_DITEMUKAN", pesan: "Sesi presensi tidak ditemukan" } },
      { status: 404 }
    );
  }

  const sekarang = new Date();
  const jendela = getWindowNumber(sekarang.getTime());
  const token = generateQrToken(sesi.qrSecret, sesi.id, jendela);
  const detikSisa = QR_WINDOW_SECONDS - (Math.floor(sekarang.getTime() / 1000) % QR_WINDOW_SECONDS);

  return NextResponse.json(
    {
      sukses: true,
      sesiId: sesi.id,
      judulAgenda: sesi.agenda.judul,
      payload: susunPayloadQr(sesi.id, token),
      jendela,
      detikSisa,
      bukaAt: sesi.bukaAt,
      tutupAt: sesi.tutupAt,
      radiusM: sesi.agenda.radiusM ?? null,
      status: hitungStatusSesi(sesi.bukaAt, sesi.tutupAt, sekarang),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
