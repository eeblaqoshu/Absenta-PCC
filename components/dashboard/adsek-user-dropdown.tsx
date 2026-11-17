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
  Loader2,
} from "lucide-react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";

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
      {profileModalOpen && (
        <Modal onClose={() => setProfileModalOpen(false)} ariaLabel="Profil akun adsek" size="md">
          <ModalHeader
            title="Profil Akun Adsek"
            description="Informasi akun yang sedang login."
            icon={User}
            onClose={() => setProfileModalOpen(false)}
          />

          <ModalBody>
            <div className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-surface p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-md shadow-primary/20">
                {initials || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-navy">{adsek.nama}</h4>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-muted">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {email}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-secondary/25 bg-secondary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                  <Shield className="h-3 w-3" />
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] py-2">
                <span className="text-slate-muted">Tipe Akun</span>
                <span className="font-semibold text-navy">Adsek (Admin / Sekretaris)</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] py-2">
                <span className="text-slate-muted">Hak Akses</span>
                <span className="text-right font-semibold text-navy">
                  {adsek.role === "admin"
                    ? "Penuh (Periode, STO, Proker & Agenda)"
                    : "Operasional (Proker & Agenda)"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] py-2">
                <span className="text-slate-muted">Status Akun</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aktif (Firebase Auth)
                </span>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="w-full rounded-xl bg-primary px-5 py-2.5 text-center text-xs font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-secondary sm:w-auto"
            >
              Tutup
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
