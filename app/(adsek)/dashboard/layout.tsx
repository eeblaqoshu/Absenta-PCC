import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { AdsekUserDropdown } from "@/components/dashboard/adsek-user-dropdown";

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

  return (
    <div className="min-h-screen bg-surface font-sans text-navy flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(11,42,91,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Left: Brand */}
            <div className="flex items-center shrink-0">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-[#E2E8F0] bg-white p-0.5 shadow-sm group-hover:scale-105 transition-transform">
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
                    {adsek.role.replace("_", " ")}
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Navigation Tabs */}
            <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="pointer-events-auto">
                <DashboardNav isAdmin={isAdmin} />
              </div>
            </div>

            {/* Right: User Dropdown (Profil & Keluar) */}
            <div className="flex items-center shrink-0">
              <AdsekUserDropdown adsek={adsek} email={session.email} />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <DashboardNav isAdmin={isAdmin} mobile={true} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
