// app/(adsek)/dashboard/periode/page.tsx
import { requireAdsek } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PeriodeManager } from "@/components/dashboard/periode-manager";

export default async function PeriodePage() {
  const adsek = await requireAdsek();
  const isAdmin = adsek.role === "admin";

  const daftarPeriode = await prisma.periode.findMany({
    orderBy: { tglMulai: "desc" },
    include: {
      _count: {
        select: {
          sto: true,
          proker: true,
        },
      },
    },
  });

  return (
    <div className="py-2">
      <PeriodeManager initialPeriode={daftarPeriode} isAdmin={isAdmin} />
    </div>
  );
}
