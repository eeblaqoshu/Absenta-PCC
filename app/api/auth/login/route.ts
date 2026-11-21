// app/api/auth/login/route.ts
// Verifikasi Firebase ID token di server, validasi database, dan buat session cookie httpOnly
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { StatusPeriode } from "@prisma/client";
import { cekBatasLaju } from "@/lib/rate-limit";
import { z } from "zod";

const loginSchema = z.object({
  idToken: z.string().min(1, "ID token tidak boleh kosong"),
});

// Durasi session cookie: 5 hari (dalam milidetik)
const EXPIRES_IN = 5 * 24 * 60 * 60 * 1000;

// Batas percobaan login per IP: maksimal 10 permintaan per menit
const MAKS_LOGIN_PER_MENIT = 10;
const JENDELA_LOGIN_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    // 0. Pembatasan laju (rate limiting) berbasis IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown-ip";

    if (!cekBatasLaju(`login:${ip}`, MAKS_LOGIN_PER_MENIT, JENDELA_LOGIN_MS)) {
      return NextResponse.json(
        {
          error: {
            kode: "TERLALU_SERING",
            pesan:
              "Terlalu banyak percobaan masuk dari perangkat ini. Silakan tunggu beberapa saat sebelum mencoba lagi.",
          },
        },
        { status: 429 }
      );
    }

    if (!adminAuth) {
      return NextResponse.json(
        {
          error: {
            kode: "SERVER_CONFIG_ERROR",
            pesan:
              "Konfigurasi Firebase Admin di server belum lengkap. Silakan hubungi Tim Kelola",
          },
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            kode: "VALIDASI_GAGAL",
            pesan: parsed.error.issues[0]?.message || "Input tidak valid",
          },
        },
        { status: 400 }
      );
    }

    const { idToken } = parsed.data;

    // 1. Verifikasi ID Token dengan Firebase Admin SDK
    // Menggunakan checkRevoked = false agar tidak melakukan panggilan jaringan tambahan yang rawan ETIMEDOUT di hosting
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, false);
    } catch (err: unknown) {
      console.error("Error verifyIdToken:", err);
      const pesanDetail =
        err instanceof Error ? err.message : "Token tidak dapat diverifikasi";
      return NextResponse.json(
        {
          error: {
            kode: "TOKEN_INVALID",
            pesan: `Verifikasi token gagal (${pesanDetail}). Silakan coba lagi.`,
          },
        },
        { status: 401 }
      );
    }

    // Validasi Temuan 1: Pastikan email telah terverifikasi oleh provider autentikasi
    if (!decodedToken.email_verified) {
      return NextResponse.json(
        {
          error: {
            kode: "EMAIL_BELUM_VERIFIKASI",
            pesan:
              "Alamat email belum diverifikasi oleh provider autentikasi. Silakan verifikasi email Anda terlebih dahulu.",
          },
        },
        { status: 403 }
      );
    }

    const email = decodedToken.email?.toLowerCase();
    const uid = decodedToken.uid;

    if (!email) {
      return NextResponse.json(
        {
          error: {
            kode: "EMAIL_TIDAK_DITEMUKAN",
            pesan: "Akun Anda tidak memiliki alamat email yang valid.",
          },
        },
        { status: 400 }
      );
    }

    // 2. Cek Akun Adsek (Prioritas 1)
    const adsek = await prisma.akunAdsek.findUnique({
      where: { email },
    });

    let role: "adsek" | "sto" | null = null;
    let redirectUrl = "/";

    if (adsek) {
      role = "adsek";
      redirectUrl = "/dashboard";

      // Validasi Temuan 1: Cek kecocokan UID jika akun sudah memiliki firebaseUid terdaftar
      if (adsek.firebaseUid && adsek.firebaseUid !== uid) {
        return NextResponse.json(
          {
            error: {
              kode: "UID_MISMATCH",
              pesan:
                "Identitas akun Firebase tidak sesuai dengan data terdaftar.",
            },
          },
          { status: 403 }
        );
      }

      // Sinkronisasi firebase_uid jika belum terisi
      if (!adsek.firebaseUid) {
        await prisma.akunAdsek.update({
          where: { id: adsek.id },
          data: { firebaseUid: uid },
        });
      }
    } else {
      // 3. Cek STO pada periode aktif (Prioritas 2)
      const periodeAktif = await prisma.periode.findFirst({
        where: { status: StatusPeriode.aktif },
      });

      if (!periodeAktif) {
        return NextResponse.json(
          {
            error: {
              kode: "PERIODE_TIDAK_AKTIF",
              pesan:
                "Saat ini belum ada periode kepengurusan yang berstatus aktif.",
            },
          },
          { status: 403 }
        );
      }

      const sto = await prisma.sto.findFirst({
        where: {
          emailGoogle: email,
          periodeId: periodeAktif.id,
        },
      });

      if (sto) {
        role = "sto";
        redirectUrl = "/home";

        // Validasi Temuan 1: Cek kecocokan UID jika STO sudah memiliki firebaseUid terdaftar
        if (sto.firebaseUid && sto.firebaseUid !== uid) {
          return NextResponse.json(
            {
              error: {
                kode: "UID_MISMATCH",
                pesan:
                  "Identitas akun Firebase tidak sesuai dengan data terdaftar.",
              },
            },
            { status: 403 }
          );
        }

        // Sinkronisasi firebase_uid saat login pertama
        if (!sto.firebaseUid) {
          await prisma.sto.update({
            where: { id: sto.id },
            data: { firebaseUid: uid },
          });
        }
      }
    }

    // Jika tidak terdaftar di akun_adsek maupun STO periode aktif -> TOLAK
    if (!role) {
      return NextResponse.json(
        {
          error: {
            kode: "EMAIL_TIDAK_TERDAFTAR",
            pesan:
              "Email Anda belum terdaftar sebagai pengurus STO periode aktif atau adsek.",
          },
        },
        { status: 403 }
      );
    }

    // 4. Buat Firebase Session Cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN,
    });

    // 5. Kembalikan response dengan cookie httpOnly
    const response = NextResponse.json({
      sukses: true,
      role,
      redirectUrl,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      maxAge: Math.floor(EXPIRES_IN / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Internal login error:", error);
    return NextResponse.json(
      {
        error: {
          kode: "INTERNAL_SERVER_ERROR",
          pesan: "Terjadi kesalahan internal saat memproses autentikasi.",
        },
      },
      { status: 500 }
    );
  }
}
