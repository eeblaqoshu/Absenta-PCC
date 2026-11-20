// app/(sto)/kepanitiaan/page.tsx
// Halaman Kepanitiaan STO: Menampilkan seluruh data program kerja dan peran kepanitiaan STO yang sedang login.
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StoNavbar } from "@/components/sto/sto-navbar";
import {
  Users,
  FolderKanban,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
} from "lucide-react";
import {
  getPeranBadge,
  getJenisAgendaBadge,
} from "@/components/dashboard/proker-detail/types";
import { formatTanggalIndo, jamDariWaktuAgenda } from "@/lib/waktu";

export default async function StoKepanitiaanPage() {
  const sto = await requireSto();

  const periode = await prisma.periode.findUnique({
    where: { id: sto.periodeId },
    select: { nama: true },
  });

  const daftarKepanitiaan = await prisma.kepanitiaan.findMany({
    where: {
      stoId: sto.id,
      proker: {
        periodeId: sto.periodeId,
      },
    },
    include: {
      proker: {
        include: {
          periode: { select: { nama: true, status: true } },
          agenda: {
            select: {
              id: true,
              judul: true,
              jenis: true,
              tglPelaksanaan: true,
              tglSelesai: true,
              waktuPelaksanaan: true,
              lokasiNama: true,
            },
            orderBy: { tglPelaksanaan: "asc" },
          },
          kepanitiaan: {
            include: {
              sto: {
                select: {
                  id: true,
                  nama: true,
                  nim: true,
                  divisi: true,
                  jabatan: true,
                },
              },
            },
            orderBy: [{ peran: "asc" }, { divisiPanitia: "asc" }],
          },
        },
      },
    },
    orderBy: {
      proker: { nama: "asc" },
    },
  });

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased pb-20">
      {/* Top Navbar */}
      <StoNavbar sto={sto} periodeNama={periode?.nama} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Banner Header Halaman */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-muted">
              Susunan Organisasi & Proker
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              Kepanitiaan Saya
            </h1>
            <p className="text-xs sm:text-sm text-slate-muted max-w-2xl leading-relaxed">
              Daftar program kerja (proker) dan peran divisi kepanitiaan yang Anda emban pada
              periode kepengurusan aktif ini.
            </p>
          </div>
        </div>

        {/* Konten Daftar Kepanitiaan */}
        {daftarKepanitiaan.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center text-slate-muted mx-auto">
              <FolderKanban className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-navy">Belum Terdaftar di Kepanitiaan Proker</h3>
            <p className="text-xs text-slate-muted max-w-md mx-auto leading-relaxed">
              Anda belum ditugaskan dalam susunan kepanitiaan program kerja manapun pada periode{" "}
              <span className="font-semibold text-navy">{periode?.nama || "aktif"}</span>. Data akan
              otomatis muncul di sini setelah didaftarkan oleh sekretaris/admin.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {daftarKepanitiaan.map((item) => {
              const { proker, peran, divisiPanitia } = item;
              const badgePeran = getPeranBadge(peran, divisiPanitia);
              const rekanPanitia = proker.kepanitiaan.filter((k) => k.stoId !== sto.id);

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden divide-y divide-[#E2E8F0]"
                >
                  {/* Header Kartu Proker */}
                  <div className="p-6 sm:p-7 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
                          {proker.nama}
                        </h2>
                      </div>

                      {/* Badge Peran STO */}
                      <div className="shrink-0 flex items-center gap-2">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${badgePeran.bg}`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{badgePeran.label}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-muted leading-relaxed">
                      {proker.deskripsi || "Tidak ada deskripsi program kerja."}
                    </p>

                    {/* Ringkasan Statistik Proker */}
                    <div className="flex items-center gap-6 pt-2 text-xs text-slate-muted font-medium">
                      <div className="flex items-center gap-1.5 text-navy">
                        <Users className="w-4 h-4 text-secondary" />
                        <span>{proker.kepanitiaan.length} Total Panitia</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-navy">
                        <Calendar className="w-4 h-4 text-accent" />
                        <span>{proker.agenda.length} Kegiatan</span>
                      </div>
                    </div>
                  </div>

                  {/* Section Rangkaian Kegiatan Proker */}
                  <div className="p-6 sm:p-7 bg-surface/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-muted flex items-center gap-1.5">
                        Rangkaian Kegiatan Proker
                      </h4>
                    </div>

                    {proker.agenda.length === 0 ? (
                      <p className="text-xs text-slate-muted py-2">
                        Belum ada kegiatan yang dijadwalkan pada program kerja ini.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {proker.agenda.map((ag) => {
                          const badgeAgenda = getJenisAgendaBadge(ag.jenis);
                          const jamStr = jamDariWaktuAgenda(ag.waktuPelaksanaan);
                          return (
                            <div
                              key={ag.id}
                              className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-2 hover:border-secondary/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="text-xs sm:text-sm font-bold text-navy line-clamp-1">
                                  {ag.judul}
                                </h5>
                                <span
                                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeAgenda.color}`}
                                >
                                  {badgeAgenda.label}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-muted">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-secondary" />
                                  <span>
                                    {formatTanggalIndo(ag.tglPelaksanaan)} • {jamStr} WIB
                                  </span>
                                </div>
                                {ag.lokasiNama && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-accent" />
                                    <span>{ag.lokasiNama}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
