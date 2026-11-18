import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.type !== "adsek" || !session.adsek) {
    redirect("/login");
  }

  const { adsek } = session;
  const isAdmin = adsek.role === "admin";
  const navItems: DashboardNavItem[] = [
    { href: "/dashboard", label: "Ringkasan", icon: "home", section: "Utama" },
    { href: "/dashboard/proker", label: "Proker & agenda", icon: "proker", section: "Utama" },
    { href: "/dashboard/izin", label: "Izin", icon: "izin", section: "Utama" },
    { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "leaderboard", section: "Utama" },
    ...(isAdmin
      ? [
          { href: "/dashboard/sto", label: "Data STO", icon: "sto" as const, section: "Admin" },
          { href: "/dashboard/periode", label: "Periode", icon: "period" as const, section: "Admin" },
          { href: "/dashboard/lokasi", label: "Lokasi", icon: "location" as const, section: "Admin" },
        ]
      : []),
    { href: "/dashboard/profil", label: "Profil akun", icon: "profile", section: "Akun" },
  ];

  return (
    <DashboardShell
      name={adsek.nama}
      detail={session.email}
      roleLabel={adsek.role.replaceAll("_", " ")}
      navItems={navItems}
    >
        {children}
    </DashboardShell>
  );
}
