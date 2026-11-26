// app/api/auth/logout/route.ts
// Mencabut refresh token Firebase di server dan menghapus session cookie
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSession } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST() {
  try {
    const session = await getSession();
    if (session?.firebaseUid && adminAuth) {
      await adminAuth.revokeRefreshTokens(session.firebaseUid);
    }
  } catch (error) {
    console.error("Gagal mencabut token sesi Firebase saat logout:", error);
  }

  const response = NextResponse.json({
    sukses: true,
    pesan: "Berhasil keluar",
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
    httpOnly: true,
  });

  return response;
}
