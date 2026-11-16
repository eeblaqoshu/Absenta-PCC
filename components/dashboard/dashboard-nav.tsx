// components/dashboard/dashboard-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Users,
} from "lucide-react";

interface DashboardNavProps {
  isAdmin: boolean;
  mobile?: boolean;
}

export function DashboardNav({ isAdmin, mobile = false }: DashboardNavProps) {
  const pathname = usePathname();

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
    ...(isAdmin
      ? [
          {
            href: "/dashboard/periode",
            label: "Periode",
            icon: Calendar,
            isActive: pathname.startsWith("/dashboard/periode"),
          },
          {
            href: "/dashboard/sto",
            label: "Data STO",
            icon: Users,
            isActive: pathname.startsWith("/dashboard/sto"),
          },
        ]
      : []),
  ];

  if (mobile) {
    return (
      <div className="flex items-center justify-center gap-6 px-4 border-t border-[#E2E8F0] overflow-x-auto bg-white/95 backdrop-blur-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-2 py-3 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors group ${
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
                  layoutId="mobile-navbar-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1 h-16">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2 h-16 px-4 text-xs font-medium tracking-wide transition-colors group ${
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
                layoutId="desktop-navbar-indicator"
                className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-secondary rounded-t-full shadow-xs shadow-secondary/40"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ) : (
              <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-transparent group-hover:bg-[#CBD5E1]/60 rounded-t-full transition-colors" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
