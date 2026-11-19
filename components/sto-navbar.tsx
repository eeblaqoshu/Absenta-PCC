"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { Home, FileText, BarChart3 } from "lucide-react";

interface StoNavbarProps {
  periodeNama?: string | null;
}

export function StoNavbar({ periodeNama }: StoNavbarProps) {
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(11,42,91,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Sisi Kiri: Logo PCC & Brand */}
          <Link href="/home" className="flex items-center gap-3 shrink-0 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#E2E8F0] bg-white p-0.5 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Image
                src="/logo-pcc.png"
                alt="Logo UKM PCC"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold tracking-tight text-primary leading-tight">
                Absenta
              </h1>
              <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold">
                STO
              </p>
            </div>
          </Link>

          {/* Tengah: Menu Navigasi (Home, Izin, Statistik Absensi) */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-surface/80 rounded-2xl border border-[#E2E8F0]/80">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    item.isActive
                      ? "bg-white text-secondary shadow-sm font-bold border border-[#E2E8F0]/60"
                      : "text-slate-muted hover:text-primary hover:bg-white/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden text-[11px]">
                    {item.label === "Statistik Absensi" ? "Statistik" : item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Sisi Kanan: Tombol Logout Doang */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
