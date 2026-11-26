// app/(adsek)/dashboard/profil/page.tsx
// Halaman pengelolaan data akun Adsek / PI (Admin, Sekretaris Umum, Sekretaris Inti)
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { StatusPeriode } from "@prisma/client";
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

  if (adsek.role !== "admin") {
    redirect("/dashboard");
  }

  // 1. Ambil data akun Adsek dan periode aktif dari database MySQL
  const [daftarAdsek, periodeAktif] = await Promise.all([
    prisma.akunAdsek.findMany({
      orderBy: { id: "asc" },
    }),
    prisma.periode.findFirst({
      where: { status: StatusPeriode.aktif },
      select: { nama: true },
    }),
  ]);

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
    <div className="py-2 space-y-6">
      <AdsekTable
        data={adsekTableData}
        currentUserId={adsek.id}
        currentUserRole={adsek.role}
        namaPeriode={periodeAktif?.nama || "Tidak Ada Periode Aktif"}
      />
    </div>
  );
}
