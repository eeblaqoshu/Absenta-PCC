// app/api/presensi/scan/route.ts
// Endpoint scan presensi STO. Seluruh validasi dilakukan di server (PRD 5.6).
// Klien hanya mengirim: payload QR hasil scan + koordinat GPS.
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import { hitungJarakHaversine, validasiRadius } from "@/lib/geo";
import { parsePayloadQr, verifyQrToken } from "@/lib/qr-token";
import {
  agendaTelahBerlalu,
  hitungMenitTerlambat,
  statusDariMenitTerlambat,
} from "@/lib/waktu";
import { cekBatasLaju } from "@/lib/rate-limit";
import { z } from "zod";

const scanSchema = z.object({
  qr: z.string().min(1, "Payload QR tidak boleh kosong"),
  lat: z.coerce
    .number()
    .min(-90, "Latitude tidak valid")
    .max(90, "Latitude tidak valid")
    .refine((v) => Number.isFinite(v), "Koordinat latitude tidak valid"),
  lng: z.coerce
    .number()
    .min(-180, "Longitude tidak valid")
    .max(180, "Longitude tidak valid")
    .refine((v) => Number.isFinite(v), "Koordinat longitude tidak valid"),
  akurasi: z.coerce.number().positive().optional(),
});

/** Maksimal 12 percobaan scan per menit per STO. */
const MAKS_SCAN_PER_MENIT = 12;
const JENDELA_LAJU_MS = 60_000;

function tolak(status: number, kode: string, pesan: string, tambahan?: object) {
  return NextResponse.json({ error: { kode, pesan, ...tambahan } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Sesi login valid & terdaftar sebagai STO periode aktif ──────────────
    const session = await getSession();
    if (!session || session.type !== "sto" || !session.sto) {
      return tolak(
        401,
        "SESI_TIDAK_VALID",
        "Sesi login tidak valid. Silakan login ulang sebagai pengurus STO."
      );
    }
    const sto = session.sto;

    // Batasi laju supaya endpoint tidak bisa di-spam.
    if (!cekBatasLaju(`scan:${sto.id}`, MAKS_SCAN_PER_MENIT, JENDELA_LAJU_MS)) {
      return tolak(429, "TERLALU_SERING", "Terlalu banyak percobaan scan. Coba lagi sebentar lagi.");
    }

    const body = await req.json().catch(() => null);
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return tolak(400, "VALIDASI_GAGAL", parsed.error.issues[0].message);
    }
    const { qr, lat, lng, akurasi } = parsed.data;

    // Tolak koordinat Null Island (0, 0)
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      return tolak(
        400,
        "GPS_TIDAK_VALID",
        "Koordinat GPS tidak valid. Pastikan GPS perangkat Anda telah mendapatkan sinyal lokasi nyata."
      );
    }

    // Tolak jika akurasi GPS terlalu rendah/buruk (> 1000 m)
    if (akurasi !== undefined && akurasi > 1000) {
      return tolak(
        400,
        "GPS_TIDAK_AKURAT",
        `Akurasi sinyal GPS perangkat Anda terlalu rendah (±${Math.round(akurasi)} m). Silakan tunggu hingga sinyal GPS stabil.`
      );
    }

    // ── 2. Payload QR & token valid ───────────────────────────────────────────
    const isiQr = parsePayloadQr(qr);
    if (!isiQr) {
      return tolak(
        400,
        "QR_TIDAK_VALID",
        "QR tidak dikenali. Pastikan Anda memindai QR presensi yang benar."
      );
    }

    const sesi = await prisma.sesiPresensi.findUnique({
      where: { id: isiQr.sesiId },
      include: {
        agenda: {
          select: {
            id: true,
            judul: true,
            lat: true,
            lng: true,
            radiusM: true,
            proker: {
              select: { id: true, periode: { select: { status: true } } },
            },
          },
        },
      },
    });

    if (!sesi) {
      return tolak(404, "SESI_TIDAK_DITEMUKAN", "Sesi presensi dari QR ini tidak ditemukan.");
    }

    const sekarang = new Date();
    const tokenValid = verifyQrToken(isiQr.token, sesi.qrSecret, sesi.id, sekarang.getTime());
    if (!tokenValid) {
      return tolak(
        400,
        "QR_KEDALUWARSA",
        "QR sudah kedaluwarsa. Minta adsek menampilkan QR terbaru di layar."
      );
    }

    // ── 3. Waktu server di dalam jendela buka–tutup ───────────────────────────
    if (sekarang < sesi.bukaAt) {
      return tolak(400, "SESI_BELUM_DIBUKA", "Sesi presensi ini belum dibuka.");
    }
    // Jika hari pelaksanaan sesi telah berlalu (hari berikutnya), sesi ditutup
    if (agendaTelahBerlalu(sesi.bukaAt, undefined, sekarang)) {
      return tolak(400, "SESI_SUDAH_DITUTUP", "Sesi presensi untuk hari ini telah berakhir.");
    }

    // Periode selesai bersifat read-only: tidak boleh ada presensi baru.
    if (sesi.agenda.proker.periode.status === "selesai") {
      return tolak(
        403,
        "PERIODE_READ_ONLY",
        "Periode kepengurusan agenda ini sudah selesai dan bersifat read-only."
      );
    }

    // ── 4. Jarak Haversine & Validasi Radius ────────────────────────────────
    // Titik presensi diambil dari AGENDA (sesi memakai titik agenda).
    // Jika melebihi radius presensi, proses absensi gagal.
    if (sesi.agenda.lat === null || sesi.agenda.lng === null) {
      return tolak(
        409,
        "LOKASI_AGENDA_BELUM_DIATUR",
        "Titik lokasi presensi agenda ini belum diatur adsek."
      );
    }
    const radiusM = sesi.agenda.radiusM ?? 500;
    const { valid: dalamRadius, jarakM } = validasiRadius(
      lat,
      lng,
      Number(sesi.agenda.lat),
      Number(sesi.agenda.lng),
      radiusM
    );

    if (!dalamRadius) {
      return tolak(
        400,
        "DI_LUAR_RADIUS",
        `Anda berada di luar radius presensi (${jarakM} meter dari lokasi kegiatan, batas maksimal ${radiusM} meter). Presensi gagal.`,
        { jarakM, radiusM }
      );
    }

    // ── 5. STO berhak atas agenda (aturan target_peserta) ────────────────────
    const akses = await bolehAkses(sto.id, sesi.agendaId);
    if (!akses.boleh) {
      return tolak(403, "TIDAK_BERHAK", akses.alasan ?? "Anda tidak berhak atas agenda ini.");
    }

    // ── 6. Belum pernah absen di sesi ini ────────────────────────────────────
    // Keterlambatan dihitung terhadap jam maksimal kedatangan (tutupAt):
    // - Jika scan di antara jam mulai (bukaAt) dan jam maksimal (tutupAt): tepat waktu (hadir, 0 menit)
    // - Jika scan setelah jam maksimal (tutupAt): terlambat (terlambat, menitTerlambat > 0)
    const menitTerlambat = hitungMenitTerlambat(sesi.tutupAt, sekarang);
    const status = statusDariMenitTerlambat(menitTerlambat);

    const presensi = await prisma.presensi.create({
      data: {
        sesiId: sesi.id,
        stoId: sto.id,
        waktuScan: sekarang,
        lat,
        lng,
        jarakM,
        status,
        diLuarRadius: false,
        statusVerifikasi: "diterima",
        menitTerlambat,
      },
    });

    return NextResponse.json({
      sukses: true,
      pesan:
        status === "hadir"
          ? "Presensi berhasil. Status: hadir."
          : "Presensi berhasil. Status: terlambat.",
      sesiId: sesi.id,
      status,
      waktuScan: presensi.waktuScan,
      jarakM,
      radiusM,
      diLuarRadius: false,
      statusVerifikasi: presensi.statusVerifikasi,
      agendaJudul: sesi.agenda.judul,
    });
  } catch (err: unknown) {
    // Tangani pelanggaran UNIQUE(sesi_id, sto_id) dengan pesan ramah.
    const kode = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
    if (kode === "P2002") {
      return tolak(409, "SUDAH_ABSEN", "Anda sudah melakukan presensi pada sesi ini.");
    }

    console.error("Error scan presensi:", err);
    return tolak(500, "SERVER_ERROR", "Terjadi kesalahan di server saat memproses presensi.");
  }
}
