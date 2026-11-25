// app/(adsek)/dashboard/profil/adsek/baru/page.tsx
// Halaman untuk membuat akun Adsek / PI baru
import { requireAdsek } from "@/lib/auth";
import { RoleAdsek } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { FormTambahAdsek } from "@/components/dashboard/form-tambah-adsek";

export default async function TambahAdsekPage() {
  await requireAdsek([RoleAdsek.admin]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigasi Kembali */}
      <div>
        <Link
          href="/dashboard/profil"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Profil &amp; Data Pengelola
        </Link>
      </div>

      {/* Card Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-muted mb-1">
            <UserPlus className="w-4 h-4 text-secondary" />
            <span>Manajemen Akun Pengelola</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            Tambah Akun Adsek / PI
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            Daftarkan akun pengelola baru dengan email dan kata sandi untuk
            mengakses sistem presensi.
          </p>
        </div>

        <FormTambahAdsek />
      </div>
    </div>
  );
}
