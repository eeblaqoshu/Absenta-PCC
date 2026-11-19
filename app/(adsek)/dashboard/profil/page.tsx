// app/(adsek)/dashboard/profil/page.tsx
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusPeriode } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  User,
  Shield,
  Mail,
  CheckCircle2,
  ArrowLeft,
  FolderKanban,
  Calendar,
  Clock,
  FileText,
  MapPin,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { LogoutButton } from "@/components/ui/logout-button";

export default async function AdsekProfilPage() {
  const session = await getSession();
  if (!session || session.type !== "adsek" || !session.adsek) {
    redirect("/login");
  }

  const { adsek, email, firebaseUid } = session;
  const isAdmin = adsek.role === "admin";
  const roleLabel = adsek.role.replace(/_/g, " ");

  // Ambil detail akun beserta ringkasan aktivitas administrasi
  const adsekDetail = await prisma.akunAdsek.findUnique({
    where: { id: adsek.id },
    include: {
      _count: {
        select: {
          prokerDibuat: true,
          agendaDibuat: true,
          sesiDibuat: true,
          izinDitinjau: true,
          lokasiDibuat: true,
        },
      },
    },
  });

  // Ambil informasi periode aktif saat ini
  const periodeAktif = await prisma.periode.findFirst({
    where: { status: StatusPeriode.aktif },
  });

  const initials = adsek.nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      {/* Navigasi Kembali */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Banner Profil */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-secondary" />
            <span className="text-xs font-semibold text-slate-muted">
              Portal Pengelola Sistem Presensi
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            Profil Akun Adsek
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            Informasi kredensial, peran kepengurusan, dan rekam aktivitas
            administrasi Anda.
          </p>
        </div>
      </div>

      {/* Layout Grid Dua Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Kartu Identitas & Sesi */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Kartu Profil Utama */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4">
              {/* Avatar Slot */}
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl border-2 border-[#CBD5E1] bg-gradient-to-br from-primary to-secondary text-white font-bold text-2xl flex items-center justify-center shadow-md shadow-primary/20 select-none">
                  <span>{initials || "A"}</span>
                </div>
                <div
                  title="Akun Adsek Terverifikasi"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-secondary text-white flex items-center justify-center shadow-md border-2 border-white"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-primary tracking-tight">
                {adsek.nama}
              </h2>
              <p className="text-xs text-slate-muted mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-muted shrink-0" />
                <span className="truncate">{email}</span>
              </p>
            </div>

            <div className="pt-3.5 border-t border-[#E2E8F0] grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[11px] text-slate-muted">Role Adsek</p>
                <p className="font-semibold text-navy mt-0.5 capitalize truncate">
                  {roleLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-muted">Tingkat Akses</p>
                <p className="font-semibold text-navy mt-0.5 truncate">
                  {isAdmin ? "Admin Penuh" : "Sekretaris"}
                </p>
              </div>
            </div>
          </div>

          {/* Kartu Sesi & Logout */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-muted uppercase tracking-wider">
              Sesi Autentikasi
            </h4>
            <div className="p-3.5 rounded-2xl bg-surface border border-[#E2E8F0] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-muted">Metode Login</span>
                <span className="font-semibold text-navy">
                  Firebase Email/Pass
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-muted">Status Sesi</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aktif
                </span>
              </div>
            </div>
            <div className="pt-2">
              <LogoutButton className="w-full justify-center py-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70" />
            </div>
          </div>
        </aside>

        {/* Kolom Kanan: Rekam Aktivitas & Otoritas Sistem */}
        <section className="lg:col-span-8 space-y-5">
          {/* Ringkasan Rekam Aktivitas Administrasi */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-secondary" />
                Rekam Kontribusi Administrasi
              </h3>
              <p className="text-xs text-slate-muted mt-1">
                Total data dan aksi kepengurusan yang tercatat dibuat atau
                ditinjau oleh akun Anda.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20">
                <div className="flex items-center gap-1.5 text-secondary text-xs mb-1">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span className="font-semibold">Proker</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {adsekDetail?._count.prokerDibuat ?? 0}
                </p>
                <p className="text-[10px] text-slate-muted mt-0.5">
                  Program Kerja
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-accent/15 border border-accent/30">
                <div className="flex items-center gap-1.5 text-primary text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-semibold">Agenda</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {adsekDetail?._count.agendaDibuat ?? 0}
                </p>
                <p className="text-[10px] text-slate-muted mt-0.5">
                  Agenda Kegiatan
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-highlight/15 border border-highlight/30">
                <div className="flex items-center gap-1.5 text-[#B45309] text-xs mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-semibold">Sesi Presensi</span>
                </div>
                <p className="text-2xl font-bold text-[#B45309]">
                  {adsekDetail?._count.sesiDibuat ?? 0}
                </p>
                <p className="text-[10px] text-slate-muted mt-0.5">
                  Sesi Dibuat
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-[#E2E8F0]">
                <div className="flex items-center gap-1.5 text-navy text-xs mb-1">
                  <FileText className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-semibold">Izin Ditinjau</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {adsekDetail?._count.izinDitinjau ?? 0}
                </p>
                <p className="text-[10px] text-slate-muted mt-0.5">
                  Tinjauan Izin
                </p>
              </div>
            </div>
          </div>

          {/* Rincian Kredensial & Hak Akses Sistem */}
          <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-secondary" />
              Detail Otoritas & Keamanan Akun
            </h3>

            <div className="space-y-3 text-xs divide-y divide-[#E2E8F0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2">
                <span className="text-slate-muted font-medium">
                  Tipe Akun Pengelola
                </span>
                <span className="font-semibold text-navy">
                  Adsek (Admin / Sekretaris Organisasi)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-3">
                <span className="text-slate-muted font-medium">
                  Periode Kepengurusan Aktif
                </span>
                <span className="font-semibold text-primary">
                  {periodeAktif ? periodeAktif.nama : "Tidak ada periode aktif"}
                </span>
              </div>

              {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-3">
                <span className="text-slate-muted font-medium">ID Pengguna Firebase (UID)</span>
                <span className="font-mono text-[11px] text-slate-muted bg-surface px-2.5 py-1 rounded-lg border border-[#E2E8F0] truncate max-w-xs">
                  {firebaseUid || adsekDetail?.firebaseUid || "-"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-3">
                <span className="text-slate-muted font-medium">Pengamanan Sesi</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cookie Terenkripsi (HttpOnly, SameSite=Lax, Secure)
                </span>
              </div> */}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
