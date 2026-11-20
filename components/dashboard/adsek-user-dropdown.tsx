// components/dashboard/adsek-user-dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { RoleAdsek } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  ChevronDown,
  Shield,
  Loader2,
  Calendar,
  Users,
  MapPin,
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
  const [loadingLogout, setLoadingLogout] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = adsek.role === "admin";

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
        aria-label="Menu Pengguna Adsek"
      >
        {/* User Icon untuk Mobile (Menggantikan icon panah bawah di layar kecil) */}
        <div className="flex sm:hidden items-center justify-center w-8 h-8 rounded-xl bg-surface border border-[#CBD5E1] text-navy group-hover:text-primary group-hover:border-secondary transition-colors">
          <User className="w-4 h-4" />
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

        {/* Chevron Icon (Desktop Only) */}
        <ChevronDown
          className={`hidden sm:block w-4 h-4 text-slate-muted transition-transform duration-200 ${
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
            <div className="px-3 py-2.5 bg-surface/70 rounded-xl mb-1 border border-[#E2E8F0]/60 space-y-2">
              <div>
                <p className="text-xs font-bold text-navy truncate">
                  {adsek.nama}
                </p>
                <p className="text-[10px] text-slate-muted truncate mt-0.5">
                  {email}
                </p>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0]/60 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-slate-muted shrink-0">
                  Role / Jabatan
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 uppercase tracking-wider truncate max-w-[130px]"
                  title={roleLabel}
                >
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Menu: Profil */}
            <Link
              href="/dashboard/profil"
              onClick={() => setDropdownOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                pathname === "/dashboard/profil"
                  ? "bg-secondary/10 text-secondary font-bold"
                  : "text-navy hover:bg-surface hover:text-secondary"
              }`}
            >
              <User className="w-4 h-4 text-slate-muted" />
              <span>Profil Akun</span>
            </Link>
            
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
    </div>
  );
}
