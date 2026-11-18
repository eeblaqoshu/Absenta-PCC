import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";

const navItems: DashboardNavItem[] = [
  { href: "/home", label: "Beranda", icon: "home", section: "Utama" },
  { href: "/scan", label: "Scan presensi", icon: "scan", section: "Utama" },
  { href: "/izin", label: "Izin", icon: "izin", section: "Utama" },
  { href: "/profil", label: "Profil", icon: "profile", section: "Akun" },
];

export default async function StoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.type !== "sto" || !session.sto) redirect("/login");

  const sto = session.sto;
  const detail = [sto.jabatan, sto.divisi].filter(Boolean).join(" · ") || session.email;

  return (
    <DashboardShell
      name={sto.nama}
      detail={detail}
      roleLabel="Pengurus STO"
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
