// app/(sto)/home/page.tsx
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import {
  formatTanggalIndo,
  formatJamIndo,
  hitungStatusAgenda,
  jamDariWaktuAgenda,
} from "@/lib/waktu";
import { StoAgendaTabs, type AgendaItem } from "@/components/sto-agenda-tabs";
import { StoProfilePanel } from "@/components/sto-profile-panel";
import { StoLocationPanel, type TitikAgendaSto } from "@/components/sto-location-panel";
import { Clock } from "lucide-react";

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
      // Sesi yang sedang dibuka sekarang (satu agenda boleh punya banyak sesi).
      sesi: {
        where: { bukaAt: { lte: sekarang }, tutupAt: { gte: sekarang } },
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

  // Presensi STO pada sesi-sesi agenda tersebut (untuk status "sudah presensi").
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
      now
    );

    // Sesi yang sedang dibuka sekarang (bisa lebih dari satu).
    const sesiAktif = ag.sesi[0] ?? null;
    const adaSesiAktif = Boolean(sesiAktif);

    const presensiSesi = sesiAktif ? presensiBySesi.get(sesiAktif.id) ?? null : null;

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
    sedangBerlangsung.length > 0 && sedangBerlangsung.every((a) => a.sudahPresensi);

  // 5. Hitung Riwayat Kehadiran STO
  const riwayat = await prisma.presensi.findMany({
    where: { stoId: sto.id },
    orderBy: { waktuScan: "desc" },
    take: 6,
    include: {
      sesi: {
        include: {
          agenda: {
            select: {
              judul: true,
              proker: { select: { nama: true } },
            },
          },
        },
      },
    },
  });
  const seluruhRiwayat = await prisma.presensi.groupBy({
    by: ["status"],
    where: { stoId: sto.id, statusVerifikasi: { not: "ditolak" } },
    _count: { _all: true },
  });
  const hadirCount = seluruhRiwayat.find((r) => r.status === "hadir")?._count._all ?? 0;
  const telatCount = seluruhRiwayat.find((r) => r.status === "terlambat")?._count._all ?? 0;

  // Inisial Nama untuk Avatar Placeholder jika foto belum ada
  const inisialNama = sto.nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-muted">{periode?.nama ?? "Periode aktif"}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Assalamu’alaikum, {sto.nama}</h1>
        </div>
        <span className="text-xs text-slate-muted">Dashboard STO</span>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(17rem,1fr)]">
        <StoLocationPanel titikAgenda={titikAgenda} />
        <StoProfilePanel
          nama={sto.nama}
          nim={sto.nim}
          jabatan={sto.jabatan}
          divisi={sto.divisi}
          foto={sto.foto}
          inisial={inisialNama}
          hadir={hadirCount}
          terlambat={telatCount}
          sudahPresensiBerjalan={sudahPresensiSemuaBerlangsung}
        />
      </div>

      <section className="min-w-0 space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-navy">Agenda</h2>
          <p className="mt-0.5 text-xs text-slate-muted">Agenda yang dapat diikuti pada periode ini.</p>
        </div>
        <StoAgendaTabs
          akanDatang={akanDatang}
          sedangBerlangsung={sedangBerlangsung}
          selesai={selesai}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-navy">Riwayat presensi</h2>
            <p className="mt-0.5 text-xs text-slate-muted">Presensi terbaru Anda.</p>
          </div>
          <Clock className="h-4 w-4 text-slate-muted" aria-hidden="true" />
        </div>
        {riwayat.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-muted">Belum ada riwayat presensi.</p>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {riwayat.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy">{item.sesi.agenda.judul}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-muted">{item.sesi.agenda.proker.nama}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-muted">{formatTanggalIndo(item.waktuScan)} · {formatJamIndo(item.waktuScan)} WIB</span>
                  <span className={`font-medium ${item.statusVerifikasi === "ditolak" ? "text-rose-600" : item.status === "hadir" ? "text-emerald-700" : "text-amber-700"}`}>
                    {item.statusVerifikasi === "ditolak" ? "Ditolak" : item.status === "hadir" ? "Hadir" : "Terlambat"}
                    {item.statusVerifikasi === "menunggu" ? " · Menunggu verifikasi" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
