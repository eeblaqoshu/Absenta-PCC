// components/dashboard/form-edit-adsek.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RoleAdsek } from "@prisma/client";
import { ubahAdsekAction } from "@/lib/actions/adsek";
import {
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";

interface Props {
  initialData: {
    id: number;
    nama: string;
    email: string;
    role: RoleAdsek;
  };
}

export function FormEditAdsek({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nama, setNama] = useState(initialData.nama);
  const [email, setEmail] = useState(initialData.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleAdsek>(initialData.role);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!nama.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Alamat email wajib diisi.");
      return;
    }
    if (password && password.length < 6) {
      setErrorMsg("Kata sandi baru minimal 6 karakter.");
      return;
    }

    const formData = new FormData();
    formData.set("id", String(initialData.id));
    formData.set("nama", nama.trim());
    formData.set("email", email.trim().toLowerCase());
    formData.set("password", password);
    formData.set("role", role);

    startTransition(async () => {
      const res = await ubahAdsekAction(null, formData);
      if (res.sukses) {
        await Swal.fire({
          icon: "success",
          title: "Berhasil Diperbarui!",
          text: res.pesan || "Data akun pengelola berhasil diperbarui.",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "rounded-2xl font-sans shadow-2xl border border-[#E2E8F0]",
          },
        });
        router.push("/dashboard/profil");
        router.refresh();
      } else {
        setErrorMsg(
          res.error?.pesan || "Terjadi kesalahan saat memperbarui akun.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input Nama */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Nama Lengkap <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            required
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Muhammad Albi"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-surface/50 text-xs text-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
          />
        </div>
      </div>

      {/* Input Email */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Alamat Email <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@polines.ac.id"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-surface/50 text-xs text-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
          />
        </div>
      </div>

      {/* Input Kata Sandi Baru (Opsional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Kata Sandi Baru{" "}
          <span className="text-slate-400 font-normal">(Opsional)</span>
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showPassword ? "text" : "password"}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#CBD5E1] bg-surface/50 text-xs text-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-muted">
          Isi kolom ini hanya jika Anda ingin mereset kata sandi akun tersebut.
        </p>
      </div>

      {/* Pilihan Peran / Jabatan */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Jabatan / Peran <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as RoleAdsek)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-surface/50 text-xs text-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all cursor-pointer"
          >
            <option value={RoleAdsek.admin}>Admin (Akses Penuh)</option>
            <option value={RoleAdsek.sekretaris_inti}>
              Sekretaris Inti (Proker, Agenda, STO, Lokasi)
            </option>
          </select>
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
        <Link
          href="/dashboard/profil"
          className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>
    </form>
  );
}
