// lib/auth.ts
// Verifikasi session cookie server dan pengambilan data pengguna (Adsek / STO)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "./firebase-admin";
import { prisma } from "./prisma";
import { RoleAdsek, StatusPeriode } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "./konstanta";

export { SESSION_COOKIE_NAME };

export interface UserSession {
  type: "adsek" | "sto";
  email: string;
  firebaseUid: string;
  adsek?: {
    id: number;
    nama: string;
    role: RoleAdsek;
  };
  sto?: {
    id: number;
    periodeId: number;
    nama: string;
    nim: string;
    jabatan: string | null;
    divisi: string | null;
    foto: string | null;
  };
}

/**
 * Mengambil data sesi pengguna saat ini di server (Server Components & Route Handlers).
 * Memverifikasi session cookie Firebase dan mencocokkan ke database.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie || !adminAuth) {
    return null;
  }

  try {
    // 1. Verifikasi cookie dengan Firebase Admin (checkRevoked = true)
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    // Temuan 1: Validasi status verifikasi email
    if (decodedClaims.email_verified === false) {
      return null;
    }

    const email = decodedClaims.email?.toLowerCase();
    const uid = decodedClaims.uid;

    if (!email) return null;

    // 2. Prioritas 1: Cocokkan ke akun_adsek
    const adsek = await prisma.akunAdsek.findUnique({
      where: { email },
    });

    if (adsek) {
      // Temuan 1: Validasi kecocokan Firebase UID
      if (adsek.firebaseUid && adsek.firebaseUid !== uid) {
        return null;
      }

      // Hubungkan firebaseUid jika belum tersimpan
      if (!adsek.firebaseUid) {
        await prisma.akunAdsek.update({
          where: { id: adsek.id },
          data: { firebaseUid: uid },
        });
      }

      return {
        type: "adsek",
        email,
        firebaseUid: uid,
        adsek: {
          id: adsek.id,
          nama: adsek.nama,
          role: adsek.role,
        },
      };
    }

    // 3. Prioritas 2: Cocokkan ke STO pada periode aktif
    const periodeAktif = await prisma.periode.findFirst({
      where: { status: StatusPeriode.aktif },
    });

    if (!periodeAktif) return null;

    const sto = await prisma.sto.findFirst({
      where: {
        emailGoogle: email,
        periodeId: periodeAktif.id,
      },
    });

    if (sto) {
      // Temuan 1: Validasi kecocokan Firebase UID
      if (sto.firebaseUid && sto.firebaseUid !== uid) {
        return null;
      }

      // Hubungkan firebaseUid jika belum tersimpan
      if (!sto.firebaseUid) {
        await prisma.sto.update({
          where: { id: sto.id },
          data: { firebaseUid: uid },
        });
      }

      return {
        type: "sto",
        email,
        firebaseUid: uid,
        sto: {
          id: sto.id,
          periodeId: sto.periodeId,
          nama: sto.nama,
          nim: sto.nim,
          jabatan: sto.jabatan,
          divisi: sto.divisi,
          foto: sto.foto,
        },
      };
    }

    // Tidak terdaftar di keduanya
    return null;
  } catch (error) {
    console.error("Gagal memverifikasi session cookie:", error);
    return null;
  }
}

/**
 * Wajib adsek. Jika bukan adsek, lakukan navigasi/redirect secara mulus (Temuan 10).
 */
export async function requireAdsek(allowedRoles?: RoleAdsek[]) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.type !== "adsek" || !session.adsek) {
    // Pengguna STO yang mencoba mengakses halaman adsek diarahkan ke portal STO
    redirect("/home");
  }

  if (allowedRoles && !allowedRoles.includes(session.adsek.role)) {
    redirect("/dashboard");
  }

  return session.adsek;
}

/**
 * Wajib STO. Jika bukan STO, lakukan navigasi/redirect secara mulus (Temuan 10).
 */
export async function requireSto() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.type !== "sto" || !session.sto) {
    // Pengguna Adsek yang mencoba mengakses halaman STO diarahkan ke dashboard adsek
    redirect("/dashboard");
  }

  return session.sto;
}
