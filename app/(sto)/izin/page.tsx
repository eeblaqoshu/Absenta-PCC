// Halaman pengajuan izin STO per agenda; sesi tidak perlu dibuat atau dibuka.
import { requireSto } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bolehAkses } from "@/lib/akses";
import {
  formatTanggalIndo,
  hitungStatusAgenda,
  jamDariWaktuAgenda,
} from "@/lib/waktu";
import { IzinSto, type AgendaIzin } from "@/components/izin-sto";

export default async function IzinPage() {
  const sto = await requireSto();
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
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-xs font-medium text-slate-muted">Pengurus STO</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Pengajuan izin</h1>
        <p className="mt-2 text-xs text-slate-muted">
          Ajukan izin untuk agenda yang akan datang atau sedang berlangsung, meski sesi presensi belum dibuka.
        </p>
      </header>
      <IzinSto daftar={daftar} />
    </section>
  );
}
