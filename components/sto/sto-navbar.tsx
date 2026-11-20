"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, FileText, BarChart3 } from "lucide-react";
import { StoUserDropdown } from "@/components/sto/sto-user-dropdown";
import { LogoutButton } from "@/components/ui/logout-button";

export interface StoNavbarUser {
  id?: number;
  nama: string;
  nim?: string;
  emailGoogle?: string;
  divisi?: string | null;
  jabatan?: string | null;
  foto?: string | null;
}

interface StoNavbarProps {
  sto?: StoNavbarUser | null;
  periodeNama?: string | null;
}

export function StoNavbar({ sto, periodeNama }: StoNavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      label: "Home",
      href: "/home",
      icon: Home,
      isActive: pathname === "/home",
    },
    {
      label: "Izin",
      href: "/izin",
      icon: FileText,
      isActive: pathname.startsWith("/izin"),
    },
    {
      label: "Statistik Absensi",
      href: "/statistik",
      icon: BarChart3,
      isActive: pathname.startsWith("/statistik"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(11,42,91,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Sisi Kiri: Brand Logo PCC & Absenta */}
          <div className="flex items-center shrink-0">
            <Link href="/home" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden p-0.5 group-hover:scale-105 transition-transform">
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
                  Absenta
                </h1>
                <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold">
                  STO
                </p>
              </div>
            </Link>
          </div>

          {/* Tengah: Navigasi Desktop Terpusat */}
          <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="pointer-events-auto">
              <nav className="flex items-center gap-1 h-16">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-2 h-16 px-3.5 text-xs font-medium tracking-wide transition-colors group ${
                        item.isActive
                          ? "text-primary font-bold"
                          : "text-slate-muted hover:text-primary font-medium"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          item.isActive
                            ? "text-secondary"
                            : "text-slate-muted/70 group-hover:text-primary"
                        }`}
                      />
                      <span>{item.label}</span>

                      {/* Active Bottom Indicator */}
                      {item.isActive ? (
                        <motion.div
                          layoutId="sto-desktop-navbar-indicator"
                          className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-secondary rounded-t-full shadow-xs shadow-secondary/40"
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 32,
                          }}
                        />
                      ) : (
                        <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-transparent group-hover:bg-[#CBD5E1]/60 rounded-t-full transition-colors" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sisi Kanan: Shortcut Scan QR + Profil Dropdown STO */}
          <div className="flex items-center shrink-0 gap-2.5">

            {sto ? (
              <StoUserDropdown sto={sto} />
            ) : (
              <LogoutButton />
            )}
          </div>
        </div>
      </div>

      {/* Navigasi Mobile (Bawah Header di Layar Kecil) */}
      <div className="lg:hidden">
        <div
          className="flex items-center justify-center gap-4 sm:gap-6 px-4 border-t border-[#E2E8F0] overflow-x-auto bg-white/95 backdrop-blur-sm scrollbar-none"
          data-lenis-prevent
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 py-3 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors group ${
                  item.isActive
                    ? "text-primary"
                    : "text-slate-muted hover:text-navy"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    item.isActive
                      ? "text-secondary"
                      : "text-slate-muted/70 group-hover:text-navy"
                  }`}
                />
                <span>{item.label}</span>
                {item.isActive && (
                  <motion.div
                    layoutId="sto-mobile-navbar-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary rounded-full"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
