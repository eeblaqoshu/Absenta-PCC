// components/dashboard/dashboard-nav.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Database,
  ChevronDown,
  Trophy,
  Users,
  Calendar,
  MapPin,
} from "lucide-react";

interface DashboardNavProps {
  isAdmin?: boolean;
  mobile?: boolean;
}

export function DashboardNav({ mobile = false }: DashboardNavProps) {
  const pathname = usePathname();
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMasterDataOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMasterDataOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
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
    },
  ];

  const masterDataItems = [
    {
      href: "/dashboard/sto",
      label: "Data STO",
      icon: Users,
    },
    {
      href: "/dashboard/periode",
      label: "Periode",
      icon: Calendar,
    },
    {
      href: "/dashboard/lokasi",
      label: "Lokasi",
      icon: MapPin,
    },
  ];

  const isMasterDataActive = masterDataItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );

  if (mobile) {
    return (
      <div
        className="flex items-center justify-center gap-4 sm:gap-6 px-4 border-t border-[#E2E8F0] overflow-x-auto bg-white/95 backdrop-blur-sm scrollbar-none"
        data-lenis-prevent-horizontal
      >
        {navItems.map((item) => {
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
                  layoutId="mobile-navbar-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* Mobile Master Data Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMasterDataOpen((prev) => !prev)}
            className={`relative flex items-center gap-1.5 py-3 text-xs font-semibold tracking-wide whitespace-nowrap transition-colors group cursor-pointer ${
              isMasterDataActive
                ? "text-primary font-bold"
                : "text-slate-muted hover:text-navy"
            }`}
          >
            <Database
              className={`w-3.5 h-3.5 transition-colors ${
                isMasterDataActive
                  ? "text-secondary"
                  : "text-slate-muted/70 group-hover:text-navy"
              }`}
            />
            <span>Master Data</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                masterDataOpen ? "rotate-180 text-primary" : "text-slate-muted"
              }`}
            />
            {isMasterDataActive && (
              <motion.div
                layoutId="mobile-navbar-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>

          <AnimatePresence>
            {masterDataOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-1.5 z-50 overflow-hidden"
              >
                {masterDataItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive =
                    pathname === sub.href ||
                    pathname.startsWith(sub.href + "/");
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setMasterDataOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isSubActive
                          ? "bg-secondary/10 text-secondary"
                          : "text-navy hover:bg-surface"
                      }`}
                    >
                      <SubIcon
                        className={`w-3.5 h-3.5 ${
                          isSubActive ? "text-secondary" : "text-slate-muted"
                        }`}
                      />
                      <span>{sub.label}</span>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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

      {/* Master Data Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setMasterDataOpen((prev) => !prev)}
          className={`relative flex items-center gap-1.5 h-16 px-3.5 text-xs font-medium tracking-wide transition-colors group cursor-pointer ${
            isMasterDataActive
              ? "text-primary font-bold"
              : "text-slate-muted hover:text-primary font-medium"
          }`}
          aria-expanded={masterDataOpen}
          aria-haspopup="true"
        >
          <Database
            className={`w-4 h-4 transition-colors ${
              isMasterDataActive
                ? "text-secondary"
                : "text-slate-muted/70 group-hover:text-primary"
            }`}
          />
          <span>Master Data</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              masterDataOpen
                ? "rotate-180 text-primary"
                : "text-slate-muted/70 group-hover:text-primary"
            }`}
          />

          {/* Active Bottom Indicator */}
          {isMasterDataActive ? (
            <motion.div
              layoutId="desktop-navbar-indicator"
              className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] bg-secondary rounded-t-full shadow-xs shadow-secondary/40"
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          ) : (
            <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-transparent group-hover:bg-[#CBD5E1]/60 rounded-t-full transition-colors" />
          )}
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {masterDataOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] p-1.5 z-50 overflow-hidden"
            >
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-muted uppercase tracking-wider">
                Menu Master Data
              </div>

              {masterDataItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive =
                  pathname === sub.href || pathname.startsWith(sub.href + "/");
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setMasterDataOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isSubActive
                        ? "bg-secondary/10 text-secondary border border-secondary/20 shadow-xs"
                        : "text-navy hover:bg-surface hover:text-secondary border border-transparent"
                    }`}
                  >
                    <SubIcon
                      className={`w-3.5 h-3.5 ${
                        isSubActive ? "text-secondary" : "text-slate-muted"
                      }`}
                    />
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
