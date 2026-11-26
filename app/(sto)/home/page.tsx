// app/(sto)/home/page.tsx
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import {
  agendaTelahBerlalu,
  formatTanggalIndo,
  hitungStatusAgenda,
  jamDariWaktuAgenda,
} from "@/lib/waktu";
import { ambilStatistikSto } from "@/lib/statistik-sto";
import { formatLabelDivisi } from "@/lib/divisi";
import { StoNavbar } from "@/components/sto/sto-navbar";
import {
  StoAgendaTabs,
  type AgendaItem,
} from "@/components/sto/sto-agenda-tabs";
import {
  StoLocationPanel,
  type TitikAgendaSto,
} from "@/components/sto-location-panel";
import {
  QrCode,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  ArrowRight,
  History,
  Calendar,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function StoHomePage() {
  const sto = await requireSto();

  // 1. Ambil Periode Aktif
  const periode = await prisma.periode.findUnique({
    where: { id: sto.periodeId },
  });

  // 2. Ambil Semua Agenda di Periode Ini
  const sekarang = new Date();
  const semuaAgenda = await prisma.agenda.findMany({
    where: {
      proker: {
        periodeId: sto.periodeId,
      },
    },
    include: {
      proker: { select: { nama: true } },
      izin: {
        where: { stoId: sto.id },
        select: { jenis: true, status: true, alasan: true },
      },
      // Sesi yang dibuka hari ini (mengakomodasi tepat waktu dan terlambat)
      sesi: {
        where: { bukaAt: { lte: sekarang } },
        orderBy: { bukaAt: "asc" },
      },
    },
    orderBy: [{ tglPelaksanaan: "asc" }, { waktuPelaksanaan: "asc" }],
  });

  // 3. Filter Agenda Berdasarkan Aturan Otorisasi bolehAkses
  const agendaAkses: typeof semuaAgenda = [];
  for (const ag of semuaAgenda) {
    const izin = await bolehAkses(sto.id, ag.id);
    if (izin.boleh) {
      ag.sesi = ag.sesi.filter(
        (s) => !agendaTelahBerlalu(s.bukaAt, undefined, sekarang),
      );
      agendaAkses.push(ag);
    }
  }

  const titikAgenda: TitikAgendaSto[] = agendaAkses
    .filter((agenda) => agenda.lat !== null && agenda.lng !== null)
    .map((agenda) => ({
      id: agenda.id,
      judul: agenda.judul,
      lokasi: agenda.lokasiNama,
      lat: Number(agenda.lat),
      lng: Number(agenda.lng),
      radiusM: agenda.radiusM ?? 500,
    }));

  // 4. Hitung Status Real-Time dan Pisahkan ke 3 Kategori
  const now = new Date();
  const akanDatang: AgendaItem[] = [];
  const sedangBerlangsung: AgendaItem[] = [];
  const selesai: AgendaItem[] = [];

  const sesiIdsSemua = agendaAkses.flatMap((ag) => ag.sesi.map((s) => s.id));
  const presensiSto =
    sesiIdsSemua.length > 0
      ? await prisma.presensi.findMany({
          where: { stoId: sto.id, sesiId: { in: sesiIdsSemua } },
          select: {
            sesiId: true,
            status: true,
            diLuarRadius: true,
            statusVerifikasi: true,
          },
        })
      : [];
  const presensiBySesi = new Map(presensiSto.map((p) => [p.sesiId, p]));

  for (const ag of agendaAkses) {
    const statusDihitung = hitungStatusAgenda(
      ag.tglPelaksanaan,
      ag.waktuPelaksanaan,
      ag.tglSelesai,
      now,
    );

    const sesiAktif = ag.sesi[0] ?? null;
    const adaSesiAktif = Boolean(sesiAktif);
    const presensiSesi = sesiAktif
      ? (presensiBySesi.get(sesiAktif.id) ?? null)
      : null;

    const item: AgendaItem = {
      id: ag.id,
      judul: ag.judul,
      prokerNama: ag.proker.nama,
      jenis: ag.jenis,
      tglFormatted: ag.tglSelesai
        ? `${formatTanggalIndo(ag.tglPelaksanaan)} – ${formatTanggalIndo(ag.tglSelesai)}`
        : formatTanggalIndo(ag.tglPelaksanaan),
      jamFormatted: `${jamDariWaktuAgenda(ag.waktuPelaksanaan)} WIB`,
      lokasiNama: ag.lokasiNama,
      targetPeserta: ag.targetPeserta,
      statusDihitung,
      adaSesiAktif,
      sudahPresensi: Boolean(presensiSesi),
      statusPresensi: presensiSesi?.status ?? null,
      diLuarRadius: presensiSesi?.diLuarRadius ?? false,
      statusVerifikasi: presensiSesi?.statusVerifikasi ?? null,
      izin: ag.izin[0]
        ? {
            jenis: ag.izin[0].jenis,
            status: ag.izin[0].status,
            alasan: ag.izin[0].alasan,
          }
        : null,
    };

    if (statusDihitung === "sedang_berlangsung") {
      sedangBerlangsung.push(item);
    } else if (statusDihitung === "akan_datang") {
      akanDatang.push(item);
    } else {
      selesai.push(item);
    }
  }

  // Semua sesi yang sedang berlangsung sudah diabsen STO ini?
  const sudahPresensiSemuaBerlangsung =
    sedangBerlangsung.length > 0 &&
    sedangBerlangsung.every((a) => a.sudahPresensi);

  // 5. Ambil Statistik Kehadiran & Sesi Selesai STO
  const statistik = await ambilStatistikSto(sto.id, sto.periodeId, now);

  return (
    <div className="min-h-screen bg-surface font-sans text-navy antialiased pb-20">
      {/* Top Navbar Terpusat (Home, Izin, Statistik) */}
      <StoNavbar sto={sto} periodeNama={periode?.nama} />

      {/* Main Responsive Grid Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Profil, Quick Actions & Statistik (Desktop 4/12, Mobile Full) */}
          <aside className="lg:col-span-4 space-y-5">
            {/* Profil STO */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-primary tracking-tight">
                    {sto.nama}
                  </h2>
                  <p className="text-xs text-slate-muted mt-0.5 font-mono">
                    {sto.nim}
                  </p>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#E2E8F0] grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-slate-muted">
                    Divisi / Departemen
                  </p>
                  <p
                    className="font-semibold text-navy mt-0.5 truncate"
                    title={sto.divisi || "Pengurus Harian"}
                  >
                    {formatLabelDivisi(sto.divisi)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-muted">Jabatan</p>
                  <p className="font-semibold text-navy mt-0.5 truncate">
                    {sto.jabatan || "Pengurus"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-muted flex items-center gap-1.5">
                  Periode
                </span>
                <span className="font-semibold text-primary font-mono text-[11px] bg-surface px-2.5 py-0.5 rounded-lg border border-[#E2E8F0]">
                  {periode?.nama || "Periode Aktif"}
                </span>
              </div>
            </div>

            {/* Quick Action 1: Scan QR Presensi */}
            {sudahPresensiSemuaBerlangsung ? (
              <div className="p-5 rounded-3xl bg-accent/15 border border-accent/40 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-secondary text-white flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-primary">
                        Sudah Presensi
                      </h3>
                      <p className="text-[11px] text-slate-muted mt-0.5">
                        Semua sesi yang sedang berlangsung sudah Anda absen
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/scan"
                    className="text-[11px] font-semibold text-secondary underline shrink-0"
                  >
                    Lihat
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href="/scan"
                className="group block p-5 rounded-3xl bg-primary hover:bg-secondary text-white shadow-md shadow-primary/20 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-white">
                      <QrCode className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">
                        Scan QR Presensi
                      </h3>
                      <p className="text-[11px] text-accent/90 mt-0.5">
                        Buka scanner kamera & GPS
                      </p>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            )}

            {/* Quick Action 2: Kepanitiaan Saya */}
            <Link
              href="/kepanitiaan"
              className="group block p-5 rounded-3xl bg-white hover:bg-surface border border-[#E2E8F0] hover:border-secondary shadow-sm hover:shadow-md transition-all text-navy"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-primary">
                      Kepanitiaan Saya
                    </h3>
                    <p className="text-[11px] text-slate-muted mt-0.5">
                      Lihat susunan proker &amp; divisi kepanitiaan Anda
                    </p>
                  </div>
                </div>
                <span className="w-7 h-7 rounded-full bg-surface border border-[#E2E8F0] flex items-center justify-center text-xs font-semibold text-slate-muted group-hover:text-secondary group-hover:translate-x-1 transition-all">
                  →
                </span>
              </div>
            </Link>

            {/* Ringkasan Statistik Presensi (4 Kategori) */}
            <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-muted uppercase tracking-wider">
                  Statistik Kehadiran
                </h4>
              </div>

              {/* 4 Kategori Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* 1. Tepat Waktu */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center gap-1 text-emerald-700 text-[11px] mb-0.5 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tepat Waktu</span>
                  </div>
                  <p className="text-xl font-black text-emerald-800">
                    {statistik.tepatWaktu}
                  </p>
                </div>

                {/* 2. Terlambat */}
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <div className="flex items-center gap-1 text-amber-700 text-[11px] mb-0.5 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Terlambat</span>
                  </div>
                  <p className="text-xl font-black text-amber-800">
                    {statistik.terlambat}
                  </p>
                </div>

                {/* 3. Jumlah Izin */}
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
                  <div className="flex items-center gap-1 text-blue-700 text-[11px] mb-0.5 font-bold">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Izin</span>
                  </div>
                  <p className="text-xl font-black text-blue-800">
                    {statistik.izin}
                  </p>
                </div>

                {/* 4. Tanpa Keterangan */}
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <div className="flex items-center gap-1 text-rose-700 text-[11px] mb-0.5 font-bold">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Tanpa Ket.</span>
                  </div>
                  <p className="text-xl font-black text-rose-800">
                    {statistik.alpa}
                  </p>
                </div>
              </div>

              {/* Tautan ke Riwayat Sesi Berakhir */}
              <Link
                href="/statistik"
                className="pt-2 border-t border-[#E2E8F0] flex items-center justify-start gap-2 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
              >
                <span>Lihat Data Sesi Selesai</span>
                <span>→</span>
              </Link>
            </div>
          </aside>

          {/* Kolom Kanan: Daftar Agenda Kegiatan (Desktop 8/12, Mobile Full) */}
          <section className="lg:col-span-8 space-y-6">
            <StoLocationPanel titikAgenda={titikAgenda} />

            {/* Banner Salam & Status Periode */}
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-muted">
                    Portal Kehadiran Pengurus
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-primary">
                  Kegiatan Kepengurusan PCC
                </h2>
                <p className="text-xs text-slate-muted mt-1">
                  Daftar kegiatan yang disesuaikan dengan divisi dan kepanitiaan
                  Anda.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Link
                  href="/statistik"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface border border-[#E2E8F0] text-navy text-xs font-bold hover:border-secondary hover:text-secondary transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  Statistik & Riwayat
                </Link>
              </div>
            </div>

            {/* Komponen 3 Tab Agenda (Mobile-Friendly & Desktop-Ready) */}
            <StoAgendaTabs
              akanDatang={akanDatang}
              sedangBerlangsung={sedangBerlangsung}
              selesai={selesai}
            />
          </section>
        </div>
      </main>
    </div>
  );
}