// components/empty-agenda.tsx
// Empty state agenda yang dipakai bersama dashboard STO dan detail proker adsek.
import { Calendar } from "lucide-react";

interface Props {
  judul?: string;
  deskripsi?: string;
}

/** Tampilan "Belum ada agenda" yang konsisten antar halaman. */
export function EmptyAgenda({
  judul = "Belum ada agenda di kategori ini",
  deskripsi = "Agenda kegiatan akan otomatis terdata setelah dijadwalkan oleh adsek/panitia terkait.",
}: Props) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-10 text-center sm:min-h-[240px]">
      <Calendar className="mx-auto mb-2.5 h-9 w-9 text-slate-muted" />
      <p className="text-sm font-semibold text-navy">{judul}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-muted">{deskripsi}</p>
    </div>
  );
}
