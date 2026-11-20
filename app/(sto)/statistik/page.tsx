// app/(sto)/statistik/page.tsx
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ambilStatistikSto } from "@/lib/statistik-sto";
import { StoNavbar } from "@/components/sto/sto-navbar";
import {
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  Calendar,
  MapPin,
} from "lucide-react";

export default async function StoStatistikPage() {
  const sto = await requireSto();

  const periode = await prisma.periode.findUnique({
    where: { id: sto.periodeId },
    select: { nama: true },
  });

  const statistik = await ambilStatistikSto(sto.id, sto.periodeId);

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased pb-20">
      {/* Top Navbar Terpusat */}
      <StoNavbar sto={sto} periodeNama={periode?.nama} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Banner Header Halaman */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-muted">
              Rekap Kehadiran Pribadi
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              Statistik & Riwayat Absensi
            </h1>
            <p className="text-xs sm:text-sm text-slate-muted max-w-2xl leading-relaxed">
              Pantau rekap kehadiran Anda pada seluruh sesi kegiatan yang telah selesai secara transparan dan akurat.
            </p>
          </div>
        </div>

        {/* 4 Kartu Kategori Statistik Presensi */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Hadir Tepat Waktu */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <p className="text-3xl sm:text-4xl font-black text-primary leading-none">
                {statistik.tepatWaktu}
              </p>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs sm:text-sm font-bold text-navy">
                Hadir Tepat Waktu
              </h3>
              <p className="text-[11px] text-slate-muted mt-0.5">Scan ≤ 15 menit awal</p>
            </div>
          </div>

          {/* 2. Hadir Terlambat */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <p className="text-3xl sm:text-4xl font-black text-primary leading-none">
                {statistik.terlambat}
              </p>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs sm:text-sm font-bold text-navy">
                Hadir Terlambat
              </h3>
              <p className="text-[11px] text-slate-muted mt-0.5">Scan lewat 15 menit</p>
            </div>
          </div>

          {/* 3. Jumlah Izin */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <p className="text-3xl sm:text-4xl font-black text-primary leading-none">
                {statistik.izin}
              </p>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs sm:text-sm font-bold text-navy">
                Jumlah Izin
              </h3>
              <p className="text-[11px] text-slate-muted mt-0.5">Disetujui oleh adsek</p>
            </div>
          </div>

          {/* 4. Tanpa Keterangan (Alpa) */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <p className="text-3xl sm:text-4xl font-black text-primary leading-none">
                {statistik.alpa}
              </p>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs sm:text-sm font-bold text-navy">
                Tanpa Keterangan
              </h3>
              <p className="text-[11px] text-slate-muted mt-0.5">Tidak hadir & tanpa izin</p>
            </div>
          </div>
        </div>

        {/* Daftar Data Absensi yang Telah Berakhir */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-lg font-bold text-primary">
                Data Absensi Sesi yang Telah Selesai
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Rekam jejak kehadiran Anda pada sesi agenda yang sudah ditutup.
              </p>
            </div>
          </div>

          {statistik.riwayat.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-slate-muted mx-auto mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-navy">Belum ada sesi presensi yang berakhir</p>
              <p className="text-xs text-slate-muted max-w-sm mx-auto">
                Setelah sesi agenda ditutup oleh adsek, riwayat kehadiran Anda akan ditampilkan secara detail di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {statistik.riwayat.map((item) => {
                const isTepatWaktu = item.statusKategori === "tepat_waktu";
                const isTerlambat =
                  item.statusKategori === "terlambat_tanpa_izin" ||
                  item.statusKategori === "terlambat_dengan_izin";
                const isIzin = item.statusKategori === "alpa_dengan_izin";
                const isAlpa = item.statusKategori === "alpa_tanpa_izin";

                return (
                  <div
                    key={item.sesiId}
                    className="p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] bg-surface/40 hover:bg-white hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                          {item.namaProker}
                        </span>
                        <span className="text-xs text-[#CBD5E1]">•</span>
                        <div className="flex items-center gap-1 text-xs text-slate-muted">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{item.tanggalFormatted}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-muted">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.jamLabel}</span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-navy">{item.judulAgenda}</h3>

                      {item.lokasiNama && (
                        <p className="text-xs text-slate-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-secondary" />
                          <span>{item.lokasiNama}</span>
                        </p>
                      )}

                      {/* Detail Tambahan (Waktu Scan / Alasan Izin) */}
                      {item.waktuScanFormatted && (
                        <p className="text-xs text-navy font-medium pt-0.5">
                          Dipindai pada pukul {item.waktuScanFormatted} WIB
                          {item.menitTerlambat > 0 && (
                            <span className="text-amber-600 font-semibold ml-1">
                              (Terlambat {item.menitTerlambat} menit)
                            </span>
                          )}
                        </p>
                      )}

                      {item.izinInfo && (
                        <p className="text-xs text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100 inline-block mt-1">
                          Alasan Izin: &ldquo;{item.izinInfo.alasan}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Sisi Kanan: Status Badge Kehadiran */}
                    <div className="flex items-center md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-0 border-[#E2E8F0]">
                      <div>
                        {isTepatWaktu && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {item.statusLabel}
                          </span>
                        )}
                        {isTerlambat && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            {item.statusLabel}
                          </span>
                        )}
                        {isIzin && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <FileText className="w-3.5 h-3.5" />
                            {item.statusLabel}
                          </span>
                        )}
                        {isAlpa && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            {item.statusLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
