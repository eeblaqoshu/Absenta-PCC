// components/dashboard/dashboard-header.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { RoleAdsek } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LayoutDashboard,
  FolderKanban,
  Trophy,
  Users,
  Calendar,
  MapPin,
  User,
  ChevronRight,
} from "lucide-react";
import { DashboardNav } from "./dashboard-nav";
import { AdsekUserDropdown } from "./adsek-user-dropdown";
import { LogoutButton } from "@/components/ui/logout-button";

interface DashboardHeaderProps {
  adsek: {
    id: number;
    nama: string;
    role: RoleAdsek;
  };
  email: string;
  isAdmin: boolean;
}

export function DashboardHeader({
  adsek,
  email,
  isAdmin,
}: DashboardHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Tutup sidebar otomatis saat rute berpindah (sesuai rekomendasi React)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setSidebarOpen(false);
  }

  // Kunci scroll body saat sidebar terbuka di mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    {
      href: "/dashboard",
      label: "Ringkasan",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      href: "/dashboard/proker",
      label: "Proker & Agenda",
      icon: FolderKanban,
      isActive: pathname.startsWith("/dashboard/proker"),
    },
    {
      href: "/dashboard/leaderboard",
      label: "Leaderboard",
      icon: Trophy,
      isActive: pathname.startsWith("/dashboard/leaderboard"),
    },
  ];

  const masterDataItems = [
    {
      href: "/dashboard/sto",
      label: "Data STO",
      icon: Users,
      isActive: pathname.startsWith("/dashboard/sto"),
    },
    {
      href: "/dashboard/periode",
      label: "Periode",
      icon: Calendar,
      isActive: pathname.startsWith("/dashboard/periode"),
    },
    {
      href: "/dashboard/lokasi",
      label: "Lokasi",
      icon: MapPin,
      isActive: pathname.startsWith("/dashboard/lokasi"),
    },
    ...(isAdmin
      ? [
          {
            href: "/dashboard/profil",
            label: "Data Admin",
            icon: User,
            isActive: pathname.startsWith("/dashboard/profil"),
          },
        ]
      : []),
  ];

  const roleLabel = adsek.role.replace(/_/g, " ");

  return (
    <>
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(11,42,91,0.04)] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Left: Brand Logo & Name */}
            <div className="flex items-center shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 sm:gap-3 group"
              >
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden p-0.5 group-hover:scale-105 transition-transform shrink-0">
                  <Image
                    src="/logo-pcc.png"
                    alt="Logo UKM PCC"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-primary leading-tight">
                    Absenta PCC
                  </h1>
                  <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold">
                    {roleLabel}
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Tabs (Hidden on mobile) */}
            <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="pointer-events-auto">
                <DashboardNav isAdmin={isAdmin} />
              </div>
            </div>

            {/* Right: Desktop User Dropdown & Mobile Burger Button (Di Kanan) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Only: User Dropdown */}
              <div className="hidden lg:block">
                <AdsekUserDropdown adsek={adsek} email={email} />
              </div>

              {/* Mobile Only: Burger Icon Button (Di Kanan Navbar) */}
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-navy hover:bg-surface border border-transparent hover:border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer"
                aria-label="Buka navigasi sidebar"
                aria-expanded={sidebarOpen}
              >
                <Menu className="w-5 h-5 text-navy" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Drawer (Slide-Over dari Kanan) */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[1100] lg:hidden flex justify-end">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-navy/40 backdrop-blur-xs"
              aria-hidden="true"
            />

            {/* Sidebar Slide-Over Panel (Muncul dari Kanan) */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 border-l border-[#E2E8F0] overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi Menu AdSek"
            >
              {/* Sidebar Top: Profil User Terpadu & Tombol Tutup */}
              <div className="p-4 sm:p-5 border-b border-[#E2E8F0] bg-surface/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-muted uppercase tracking-wider">
                    Menu AdSek
                  </span>
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-xl text-slate-muted hover:text-navy hover:bg-white transition-all cursor-pointer border border-transparent hover:border-[#E2E8F0]"
                    aria-label="Tutup navigasi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profil Pengguna Terpadu di Sidebar */}
                {isAdmin ? (
                  <Link
                    href="/dashboard/profil"
                    onClick={() => setSidebarOpen(false)}
                    className="block p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-secondary/40 hover:shadow-sm transition-all group"
                    title="Buka Data Admin"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-navy truncate group-hover:text-primary transition-colors">
                          {adsek.nama}
                        </p>
                        <p className="text-[10px] text-slate-muted truncate mt-0.5 font-mono">
                          {email}
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center shrink-0 text-slate-muted group-hover:text-secondary group-hover:bg-secondary/10 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#E2E8F0]/70 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-muted">
                        Jabatan :
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
                        {roleLabel}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-navy truncate">
                          {adsek.nama}
                        </p>
                        <p className="text-[10px] text-slate-muted truncate mt-0.5 font-mono">
                          {email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#E2E8F0]/70 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-muted">
                        Jabatan :
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Nav Links Body */}
              <div
                className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6"
                data-lenis-prevent
              >
                {/* Section: Menu Utama */}
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-muted uppercase tracking-wider mb-2">
                    Menu Utama
                  </p>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                          item.isActive
                            ? "bg-secondary/10 text-secondary border border-secondary/20 shadow-xs"
                            : "text-slate-muted hover:text-navy hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              item.isActive
                                ? "text-secondary"
                                : "text-slate-muted group-hover:text-navy"
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        )}
                      </Link>
                    );
                  })}
                </div>

                {/* Section: Master Data */}
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-muted uppercase tracking-wider mb-2">
                    Master Data
                  </p>
                  {masterDataItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                          item.isActive
                            ? "bg-secondary/10 text-secondary border border-secondary/20 shadow-xs"
                            : "text-slate-muted hover:text-navy hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              item.isActive
                                ? "text-secondary"
                                : "text-slate-muted group-hover:text-navy"
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar Footer: Keluar & Info Akun */}
              <div className="p-3.5 border-t border-[#E2E8F0] bg-surface/50 space-y-2">
                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-[10px] text-slate-muted">
                    Sesi Akun AdSek
                  </span>
                  <LogoutButton className="px-2.5 py-1 text-xs" />
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
