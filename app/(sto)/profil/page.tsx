import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StoProfilPage() {
  const sto = await requireSto();
  const email = await prisma.sto.findUnique({
    where: { id: sto.id },
    select: { emailGoogle: true },
  });
  const data = [
    ["Nama", sto.nama],
    ["NIM", sto.nim],
    ["Email", email?.emailGoogle ?? "—"],
    ["Jabatan", sto.jabatan ?? "—"],
    ["Divisi", sto.divisi ?? "—"],
  ];

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-medium text-slate-muted">Akun STO</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Profil</h1>
      </header>
      <dl className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white px-5">
        {data.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[100px_minmax(0,1fr)] gap-4 py-4 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
            <dt className="text-slate-muted">{label}</dt>
            <dd className="break-words font-medium text-navy">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
