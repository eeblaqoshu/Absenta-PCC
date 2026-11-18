interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-slate-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-navy">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-slate-muted">{detail}</p>}
    </div>
  );
}
