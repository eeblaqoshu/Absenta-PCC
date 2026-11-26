// app/(adsek)/dashboard/profil/adsek/[id]/edit/page.tsx
// Halaman untuk mengedit akun Adsek / PH yang sudah ada
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoleAdsek } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";
import { FormEditAdsek } from "@/components/dashboard/adsek";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAdsekPage({ params }: Props) {
  await requireAdsek([RoleAdsek.admin]);

  const { id } = await params;
  const adsekId = parseInt(id, 10);

  if (isNaN(adsekId) || adsekId <= 0) {
    notFound();
  }

  const adsek = await prisma.akunAdsek.findUnique({
    where: { id: adsekId },
  });

  if (!adsek) {
    notFound();
  }

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
            <UserCheck className="w-4 h-4 text-secondary" />
            <span>Manajemen Akun Pengelola</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">
            Edit Akun Adsek / PI
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            Perbarui nama, alamat email, tingkat akses peran, atau kata sandi
            untuk akun {adsek.nama}.
          </p>
        </div>

        <FormEditAdsek
          initialData={{
            id: adsek.id,
            nama: adsek.nama,
            email: adsek.email,
            role: adsek.role,
          }}
        />
      </div>
    </div>
  );
}
