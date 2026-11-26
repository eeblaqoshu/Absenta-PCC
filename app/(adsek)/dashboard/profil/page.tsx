// app/(adsek)/dashboard/profil/page.tsx
// Halaman pengelolaan data akun Adsek / PI (Admin, Sekretaris Umum, Sekretaris Inti)
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import {
  AdsekTable,
  type AdsekUserItem,
} from "@/components/dashboard/adsek";

function formatTerakhirLogin(dateString?: string | null): string | null {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return (
      new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(d) + " WIB"
    );
  } catch {
    return null;
  }
}

export default async function AdsekProfilPage() {
  const session = await getSession();
  if (!session || session.type !== "adsek" || !session.adsek) {
    redirect("/login");
  }

  const { adsek } = session;

  // 1. Ambil seluruh data akun Adsek / PI yang terdaftar di database MySQL
  const daftarAdsek = await prisma.akunAdsek.findMany({
    orderBy: { id: "asc" },
  });

  // 2. Ambil metadata waktu login terakhir dari Firebase Authentication
  const lastSignInMap = new Map<string, string>();
  if (adminAuth) {
    try {
      const identifiers = daftarAdsek
        .filter((a) => a.firebaseUid || a.email)
        .map((a) =>
          a.firebaseUid ? { uid: a.firebaseUid } : { email: a.email }
        );

      if (identifiers.length > 0) {
        const fbResult = await adminAuth.getUsers(identifiers);
        for (const u of fbResult.users) {
          if (u.metadata.lastSignInTime) {
            lastSignInMap.set(u.uid, u.metadata.lastSignInTime);
            if (u.email) {
              lastSignInMap.set(u.email.toLowerCase(), u.metadata.lastSignInTime);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Gagal mengambil metadata login terakhir dari Firebase:", err);
    }
  }

  // 3. Susun data untuk tabel Adsek / PI
  const adsekTableData: AdsekUserItem[] = daftarAdsek.map((item) => {
    const rawLoginTime =
      (item.firebaseUid ? lastSignInMap.get(item.firebaseUid) : null) ||
      lastSignInMap.get(item.email.toLowerCase()) ||
      null;

    return {
      id: item.id,
      nama: item.nama,
      email: item.email,
      role: item.role,
      firebaseUid: item.firebaseUid,
      terakhirLogin: formatTerakhirLogin(rawLoginTime),
    };
  });

  return (
    <div className="space-y-6">
      {/* Navigasi Kembali ke Dashboard */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Banner Halaman */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-muted">
              Portal Pengelola Sistem Presensi
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary flex items-center gap-2.5">
            <Users className="w-6 h-6 text-secondary" />
            Data Akun Adsek / PI
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            Kelola data kredensial, peran kepengurusan, dan hak akses akun
            administrator serta sekretaris organisasi.
          </p>
        </div>
      </div>

      {/* Tabel Data Akun Adsek / PH (Full Width) */}
      <AdsekTable
        data={adsekTableData}
        currentUserId={adsek.id}
        currentUserRole={adsek.role}
      />
    </div>
  );
}
