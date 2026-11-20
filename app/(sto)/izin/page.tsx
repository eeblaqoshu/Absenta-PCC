// Halaman pengajuan izin STO per agenda; sesi tidak perlu dibuat atau dibuka.
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import {
  formatTanggalIndo,
  hitungStatusAgenda,
  jamDariWaktuAgenda,
} from "@/lib/waktu";
import { IzinSto, type AgendaIzin } from "@/components/sto/izin-sto";
import { StoNavbar } from "@/components/sto/sto-navbar";

export default async function IzinPage() {
  const sto = await requireSto();
  const periode = await prisma.periode.findUnique({
    where: { id: sto.periodeId },
    select: { nama: true },
  });
  const sekarang = new Date();
  const agenda = await prisma.agenda.findMany({
    where: { proker: { periodeId: sto.periodeId } },
    include: { proker: { select: { nama: true } } },
    orderBy: [{ tglPelaksanaan: "asc" }, { urutan: "asc" }],
  });

  const agendaYangBisaDiikuti: Array<{
    id: number;
    judul: string;
    prokerNama: string;
    jadwal: string;
    statusAgenda: AgendaIzin["statusAgenda"];
  }> = [];

  for (const item of agenda) {
    const statusAgenda = hitungStatusAgenda(
      item.tglPelaksanaan,
      item.waktuPelaksanaan,
      item.tglSelesai,
      sekarang,
    );
    if (statusAgenda === "selesai") continue;

    const akses = await bolehAkses(sto.id, item.id);
    if (!akses.boleh) continue;

    const tanggal = item.tglSelesai
      ? `${formatTanggalIndo(item.tglPelaksanaan)} – ${formatTanggalIndo(item.tglSelesai)}`
      : formatTanggalIndo(item.tglPelaksanaan);
    agendaYangBisaDiikuti.push({
      id: item.id,
      judul: item.judul,
      prokerNama: item.proker.nama,
      jadwal: `${tanggal} • ${jamDariWaktuAgenda(item.waktuPelaksanaan)} WIB`,
      statusAgenda,
    });
  }

  const izinSaya = agendaYangBisaDiikuti.length
    ? await prisma.izin.findMany({
        where: {
          stoId: sto.id,
          agendaId: { in: agendaYangBisaDiikuti.map((item) => item.id) },
        },
      })
    : [];
  const izinPerAgenda = new Map(izinSaya.map((izin) => [izin.agendaId, izin]));

  const daftar: AgendaIzin[] = agendaYangBisaDiikuti.map((item) => {
    const izin = izinPerAgenda.get(item.id);
    return {
      agendaId: item.id,
      judul: item.judul,
      namaProker: item.prokerNama,
      jadwal: item.jadwal,
      statusAgenda: item.statusAgenda,
      izin: izin
        ? { id: izin.id, jenis: izin.jenis, status: izin.status, alasan: izin.alasan }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-navy">
      <StoNavbar sto={sto} periodeNama={periode?.nama} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm">
          <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-primary">
            Izin Tidak Hadir
          </h1>
          <p className="mt-1.5 text-xs text-slate-muted leading-relaxed">
            Ajukan izin untuk agenda yang akan datang atau sedang berlangsung. Pengajuan dapat dikirim sebelum sesi presensi dibuat atau dibuka.
          </p>
        </div>

        <IzinSto daftar={daftar} />
      </main>
    </div>
  );
}
