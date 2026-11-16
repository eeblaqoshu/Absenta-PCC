// components/dashboard/adsek-user-dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RoleAdsek } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  ChevronDown,
  Shield,
  Mail,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";

interface AdsekUserDropdownProps {
  adsek: {
    id: number;
    nama: string;
    role: RoleAdsek;
  };
  email: string;
}

export function AdsekUserDropdown({ adsek, email }: AdsekUserDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setProfileModalOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setLoadingLogout(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoadingLogout(false);
    }
  };

  // Format initials
  const initials = adsek.nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const roleLabel = adsek.role.replace(/_/g, " ");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-transparent hover:border-[#E2E8F0] hover:bg-surface transition-all group cursor-pointer"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        {/* Avatar Initials */}
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
          {initials || "A"}
        </div>

        {/* Name and Email */}
        <div className="hidden sm:flex flex-col text-left max-w-[150px] lg:max-w-[200px]">
          <span className="text-xs font-bold text-navy truncate leading-tight group-hover:text-primary transition-colors">
            {adsek.nama}
          </span>
          <span className="text-[10px] text-slate-muted truncate leading-tight mt-0.5">
            {email}
          </span>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`w-4 h-4 text-slate-muted transition-transform duration-200 ${
            dropdownOpen ? "rotate-180 text-primary" : "group-hover:text-navy"
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-1.5 z-50 overflow-hidden"
          >
            {/* Header / Info User */}
            <div className="px-3 py-2.5 bg-surface/70 rounded-xl mb-1 border border-[#E2E8F0]/60">
              <p className="text-xs font-bold text-navy truncate">
                {adsek.nama}
              </p>
              <p className="text-[10px] text-slate-muted truncate mt-0.5">
                {email}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/25">
                  <Shield className="w-3 h-3" />
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Menu: Profil */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-navy hover:bg-surface hover:text-secondary transition-colors text-left cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-muted" />
              <span>Profil</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-[#E2E8F0] my-1" />

            {/* Menu: Keluar */}
            <button
              onClick={handleLogout}
              disabled={loadingLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left cursor-pointer disabled:opacity-60"
            >
              {loadingLogout ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              ) : (
                <LogOut className="w-4 h-4 text-rose-600" />
              )}
              <span>{loadingLogout ? "Keluar..." : "Keluar"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setProfileModalOpen(false)}
              className="fixed inset-0 bg-navy/50 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-primary">
                    Profil Akun Adsek
                  </h3>
                </div>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="text-slate-muted hover:text-navy p-1 rounded-lg hover:bg-surface transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* User Card */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-[#E2E8F0]">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-white font-bold text-lg flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                    {initials || "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-navy truncate">
                      {adsek.nama}
                    </h4>
                    <p className="text-xs text-slate-muted truncate flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-slate-muted" />
                      {email}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary border border-secondary/25">
                      <Shield className="w-3 h-3" />
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0]">
                    <span className="text-slate-muted">Tipe Akun</span>
                    <span className="font-semibold text-navy">
                      Adsek (Admin / Sekretaris)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0]">
                    <span className="text-slate-muted">Hak Akses</span>
                    <span className="font-semibold text-navy text-right">
                      {adsek.role === "admin"
                        ? "Penuh (Periode, STO, Proker & Agenda)"
                        : "Operasional (Proker & Agenda)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#E2E8F0]">
                    <span className="text-slate-muted">Status Akun</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aktif (Firebase Auth)
                    </span>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={() => setProfileModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer text-center"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
