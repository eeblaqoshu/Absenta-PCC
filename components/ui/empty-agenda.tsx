// components/empty-agenda.tsx
// Empty state agenda yang dipakai bersama dashboard STO dan detail proker adsek.
import { Calendar } from "lucide-react";

interface Props {
  judul?: string;
  deskripsi?: string;
}

/** Tampilan "Belum ada kegiatan" yang konsisten antar halaman. */
export function EmptyAgenda({
  judul = "Belum ada kegiatan di kategori ini",
  deskripsi = "Kegiatan akan otomatis terdata setelah dijadwalkan oleh adsek/panitia terkait.",
}: Props) {
  return (
    <div className="rounded-3xl border border-[#E2E8F0] bg-white px-4 py-14 text-center shadow-sm">
      <Calendar className="mx-auto mb-2.5 h-9 w-9 text-slate-muted" />
      <p className="text-sm font-semibold text-navy">{judul}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-muted">{deskripsi}</p>
    </div>
  );
}
