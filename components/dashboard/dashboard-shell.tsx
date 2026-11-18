"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  FileText,
  FolderKanban,
  House,
  MapPin,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export type DashboardNavIcon =
  | "home"
  | "scan"
  | "izin"
  | "profile"
  | "proker"
  | "leaderboard"
  | "period"
  | "sto"
  | "location";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: DashboardNavIcon;
  section: string;
}

interface DashboardShellProps {
  children: ReactNode;
  name: string;
  detail: string;
  roleLabel: string;
  navItems: DashboardNavItem[];
}

const ICONS: Record<DashboardNavIcon, LucideIcon> = {
  home: House,
  scan: ClipboardCheck,
  izin: FileText,
  profile: Users,
  proker: FolderKanban,
  leaderboard: ChartNoAxesColumnIncreasing,
  period: CalendarDays,
  sto: Users,
  location: MapPin,
};

function initialName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DashboardShell({
  children,
  name,
  detail,
  roleLabel,
  navItems,
}: DashboardShellProps) {
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const sections = [...new Set(navItems.map((item) => item.section))];

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
  }

  function renderNav() {
    return sections.map((section) => (
      <div key={section} className="space-y-1">
        {sections.length > 1 && (
          <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-muted">
            {section}
          </p>
        )}
        {navItems
          .filter((item) => item.section === section)
          .map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => mobileMenuRef.current?.removeAttribute("open")}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors ${
                  active
                    ? "bg-primary/8 font-semibold text-primary"
                    : "text-slate-muted hover:bg-surface hover:text-navy"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </div>
    ));
  }

  const account = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-primary">
        {initialName(name) || "A"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-navy">{name}</span>
        <span className="block truncate text-[11px] text-slate-muted">{detail}</span>
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface text-navy lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[#E2E8F0] bg-white px-4 py-6 lg:flex">
        <Link href={navItems[0]?.href ?? "/"} className="mb-9 flex items-center gap-3 px-2">
          <Image src="/logo-pcc.png" alt="" width={34} height={34} priority />
          <span>
            <span className="block text-sm font-semibold tracking-tight text-navy">Absenta</span>
            <span className="block text-[11px] text-slate-muted">{roleLabel}</span>
          </span>
        </Link>

        <nav aria-label="Menu utama" className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-none">
          {renderNav()}
        </nav>

        <div className="mt-5 space-y-4 border-t border-[#E2E8F0] pt-4">
          {account}
          <LogoutButton className="w-full justify-start px-3 text-slate-muted hover:bg-surface hover:text-navy" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur sm:px-6 lg:hidden">
          <Link href={navItems[0]?.href ?? "/"} className="flex items-center gap-2.5">
            <Image src="/logo-pcc.png" alt="" width={30} height={30} priority />
            <span className="text-sm font-semibold text-navy">Absenta</span>
          </Link>
          <details ref={mobileMenuRef} className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium text-navy hover:bg-surface [&::-webkit-details-marker]:hidden">
              <Menu className="h-4 w-4" aria-hidden="true" />
              Menu
            </summary>
            <div className="absolute right-0 top-12 z-50 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-lg scrollbar-none">
              <p className="mb-3 border-b border-[#E2E8F0] px-2 pb-3 text-xs text-slate-muted">
                {name} <span className="px-1">·</span> {roleLabel}
              </p>
              <nav aria-label="Menu utama" className="space-y-4">
                {renderNav()}
              </nav>
              <div className="mt-3 border-t border-[#E2E8F0] pt-2">
                <LogoutButton className="w-full justify-start px-3 text-slate-muted hover:bg-surface hover:text-navy" />
              </div>
            </div>
          </details>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
