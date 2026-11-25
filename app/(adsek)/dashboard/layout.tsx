import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

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
    <div className="min-h-screen bg-surface print:bg-white font-sans text-navy flex flex-col">
      <DashboardHeader adsek={adsek} email={session.email} isAdmin={isAdmin} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
