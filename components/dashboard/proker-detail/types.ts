// components/dashboard/proker-detail/types.ts
import {
  PeranPanitia,
  JenisAgenda,
  TargetPeserta,
  StatusPeriode,
} from "@prisma/client";
import { keInputLokalWib } from "@/lib/waktu";

export const OPSI_PERAN_PANITIA = [
  {
    key: "ketua_pelaksana",
    label: "Ketua Pelaksana",
    peran: PeranPanitia.ketua,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "wakil_ketua_pelaksana",
    label: "Wakil Ketua Pelaksana",
    peran: PeranPanitia.ketua,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "sekretaris_inti",
    label: "Sekretaris Inti",
    peran: PeranPanitia.sekretaris,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "sekretaris_pelaksana",
    label: "Sekretaris Pelaksana",
    peran: PeranPanitia.sekretaris,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "bendahara_inti",
    label: "Bendahara Inti",
    peran: PeranPanitia.bendahara,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "bendahara_pelaksana",
    label: "Bendahara Pelaksana",
    peran: PeranPanitia.bendahara,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "litbang_pengawas",
    label: "Litbang Pengawas",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "pj_sie_acara",
    label: "Penanggung Jawab Sie Acara",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_acara",
    label: "Anggota Sie Acara",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_dekdok",
    label: "Penanggung Jawab Sie Dekdok",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_dekdok",
    label: "Anggota Sie Dekdok",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_humas",
    label: "Penanggung Jawab Sie Humas",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_humas",
    label: "Anggota Sie Humas",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_kreatif",
    label: "Penanggung Jawab Sie Kreatif",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_kreatif",
    label: "Anggota Sie Kreatif",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_perkap",
    label: "Penanggung Jawab Sie Perkap",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_perkap",
    label: "Anggota Sie Perkap",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_konsumsi",
    label: "Penanggung Jawab Sie Konsumsi",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_konsumsi",
    label: "Anggota Sie Konsumsi",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_dekdokre",
    label: "Penanggung Jawab Sie Dekdokre",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_dekdokre",
    label: "Anggota Sie Dekdokre",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
] as const;

export const DAFTAR_SARAN_PERAN = OPSI_PERAN_PANITIA.map((o) => o.label);

export function normalisasiPeranPanitia(
  peranInput?: string,
  divisiInput?: string,
): {
  peran: PeranPanitia;
  divisiPanitia: string;
} {
  const p = (peranInput || "").trim().toLowerCase();
  const d = (divisiInput || "").trim();

  const matched = OPSI_PERAN_PANITIA.find(
    (item) =>
      item.key === p ||
      item.label.toLowerCase() === p ||
      item.label.toLowerCase() === d.toLowerCase(),
  );
  if (matched) {
    return { peran: matched.peran, divisiPanitia: matched.label };
  }

  if (p.includes("wakil ketua"))
    return {
      peran: PeranPanitia.ketua,
      divisiPanitia: "Wakil Ketua Pelaksana",
    };
  if (p === "ketua_pelaksana" || p === "ketua pelaksana")
    return { peran: PeranPanitia.ketua, divisiPanitia: "Ketua Pelaksana" };
  if (p === "sekretaris_inti" || p === "sekretaris inti")
    return { peran: PeranPanitia.sekretaris, divisiPanitia: "Sekretaris Inti" };
  if (p === "sekretaris_pelaksana" || p === "sekretaris pelaksana")
    return {
      peran: PeranPanitia.sekretaris,
      divisiPanitia: "Sekretaris Pelaksana",
    };
  if (p === "bendahara_inti" || p === "bendahara inti")
    return { peran: PeranPanitia.bendahara, divisiPanitia: "Bendahara Inti" };
  if (p === "bendahara_pelaksana" || p === "bendahara pelaksana")
    return {
      peran: PeranPanitia.bendahara,
      divisiPanitia: "Bendahara Pelaksana",
    };
  if (p.includes("litbang") || p.includes("pengawas"))
    return { peran: PeranPanitia.pj_divisi, divisiPanitia: "Litbang Pengawas" };

  if (p === "ketua")
    return { peran: PeranPanitia.ketua, divisiPanitia: d || "Ketua Pelaksana" };
  if (p === "sekretaris")
    return {
      peran: PeranPanitia.sekretaris,
      divisiPanitia: d || "Sekretaris Pelaksana",
    };
  if (p === "bendahara")
    return {
      peran: PeranPanitia.bendahara,
      divisiPanitia: d || "Bendahara Pelaksana",
    };
  if (p === "pj_divisi" || p === "pj")
    return {
      peran: PeranPanitia.pj_divisi,
      divisiPanitia: d || "Penanggung Jawab",
    };
  if (p === "anggota")
    return { peran: PeranPanitia.anggota, divisiPanitia: d || "Anggota" };

  const gabung = `${p} ${d.toLowerCase()}`;
  if (gabung.includes("ketua")) {
    return {
      peran: PeranPanitia.ketua,
      divisiPanitia: d || peranInput?.trim() || "Ketua Pelaksana",
    };
  }
  if (gabung.includes("sekretaris") || gabung.includes("sekre")) {
    return {
      peran: PeranPanitia.sekretaris,
      divisiPanitia: d || peranInput?.trim() || "Sekretaris Pelaksana",
    };
  }
  if (gabung.includes("bendahara") || gabung.includes("bendum")) {
    return {
      peran: PeranPanitia.bendahara,
      divisiPanitia: d || peranInput?.trim() || "Bendahara Pelaksana",
    };
  }
  if (
    gabung.includes("pj") ||
    gabung.includes("koordinator") ||
    gabung.includes("penanggung")
  ) {
    return {
      peran: PeranPanitia.pj_divisi,
      divisiPanitia: d || peranInput?.trim() || "Penanggung Jawab",
    };
  }

  return {
    peran: PeranPanitia.anggota,
    divisiPanitia: d || peranInput?.trim() || "Anggota",
  };
}

export interface PanitiaItem {
  id: number;
  peran: PeranPanitia;
  divisiPanitia: string | null;
  sto: {
    id: number;
    nama: string;
    nim: string;
    emailGoogle: string;
    jabatan: string | null;
    divisi: string | null;
  };
}

export interface SesiRingkas {
  id: number;
  bukaAt: Date;
  tutupAt: Date;
}

export interface AgendaItem {
  id: number;
  jenis: JenisAgenda;
  judul: string;
  urutan: number;
  tglPelaksanaan: Date;
  tglSelesai: Date | null;
  waktuPelaksanaan: Date;
  lokasiNama: string | null;
  lokasiId: number | null;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  targetPeserta: TargetPeserta;
  statusDihitung: "akan_datang" | "sedang_berlangsung" | "selesai";
  sesi: SesiRingkas[];
}

export interface StoOption {
  id: number;
  nama: string;
  nim: string;
  emailGoogle?: string;
  jabatan?: string | null;
  divisi: string | null;
}

export interface BarisFormPanitia {
  tempId: string;
  stoId: string;
  roleKey?: string;
  peranTeks: string;
  divisiPanitia: string;
}

export interface ProkerData {
  id: number;
  nama: string;
  deskripsi: string | null;
  periode: {
    id: number;
    nama: string;
    status: StatusPeriode;
  };
  kepanitiaan: PanitiaItem[];
  agenda: AgendaItem[];
}

export const DETAK_MS = 30_000;

export function langgananDetak(cb: () => void) {
  const t = setInterval(cb, DETAK_MS);
  return () => clearInterval(t);
}

export function cuplikanDetak() {
  return Math.floor(Date.now() / DETAK_MS);
}

/** Jam "HH:mm" (WIB) dari sebuah Date */
export function keInputJam(date: Date | string): string {
  return keInputLokalWib(new Date(date)).split("T")[1] ?? "00:00";
}

/** Tanggal "YYYY-MM-DD" (WIB) dari sebuah Date */
export function keTanggalWib(date: Date | string): string {
  return keInputLokalWib(new Date(date)).split("T")[0] ?? "";
}

export function isSekretarisUmum(sto: StoOption | null | undefined): boolean {
  if (!sto) return false;
  const jab = (sto.jabatan || "").toLowerCase();
  const div = (sto.divisi || "").toLowerCase();
  return (
    jab.includes("sekretaris umum") ||
    div.includes("sekretaris umum") ||
    jab.includes("sekum") ||
    div.includes("sekum")
  );
}

export function isDivisiLitbang(
  sto: { divisi?: string | null; jabatan?: string | null } | null | undefined,
): boolean {
  if (!sto) return false;
  const div = (sto.divisi || "").toLowerCase();
  const jab = (sto.jabatan || "").toLowerCase();
  return (
    div.includes("litbang") ||
    div.includes("penelitian dan pengembangan") ||
    jab.includes("litbang")
  );
}

export function isPeranLitbangPengawas(
  roleKey?: string | null,
  divisiPanitia?: string | null,
): boolean {
  if (roleKey === "litbang_pengawas") return true;
  const d = (divisiPanitia || "").toLowerCase();
  const r = (roleKey || "").toLowerCase();
  return d.includes("litbang") || r.includes("litbang");
}

export function getPeranBadge(peran: PeranPanitia, roleName?: string | null) {
  const isNamaDivisi =
    roleName &&
    (roleName.toLowerCase().startsWith("divisi") ||
      roleName.toLowerCase().startsWith("departemen") ||
      roleName.toLowerCase().includes("workshop") ||
      roleName.toLowerCase().includes("software"));

  const label =
    roleName && !isNamaDivisi
      ? roleName
      : peran === PeranPanitia.ketua
        ? "Ketua Pelaksana"
        : peran === PeranPanitia.sekretaris
          ? "Sekretaris Pelaksana"
          : peran === PeranPanitia.bendahara
            ? "Bendahara Pelaksana"
            : peran === PeranPanitia.pj_divisi
              ? "PJ Divisi"
              : "Anggota";
  const l = label.toLowerCase();
  if (l.includes("ketua")) {
    return { label, bg: "bg-primary text-white border-primary shadow-xs" };
  }
  if (l.includes("sekretaris")) {
    return {
      label,
      bg: "bg-secondary/15 text-secondary border-secondary/30",
    };
  }
  if (l.includes("bendahara")) {
    return {
      label,
      bg: "bg-highlight/20 text-[#B45309] border-highlight/40",
    };
  }
  if (
    l.includes("penanggung jawab") ||
    l.includes("pj") ||
    l.includes("koordinator")
  ) {
    return { label, bg: "bg-accent/20 text-primary border-accent/40" };
  }
  return { label, bg: "bg-surface text-slate-muted border-[#CBD5E1]" };
}

export function getJenisAgendaBadge(jenis: JenisAgenda) {
  switch (jenis) {
    case JenisAgenda.rapat_pj:
      return {
        label: "Rapat PJ & PI",
        color: "text-primary bg-primary/10 border border-primary/20",
      };
    case JenisAgenda.rapat_besar:
      return {
        label: "Rapat Besar",
        color: "text-secondary bg-secondary/10 border border-secondary/20",
      };
    case JenisAgenda.rapat_koordinasi:
      return {
        label: "Rapat Koordinasi",
        color: "text-primary bg-accent/20 border border-accent/30",
      };
    case JenisAgenda.hari_h:
      return {
        label: "Hari H Pelaksanaan",
        color: "text-[#B45309] bg-highlight/20 border border-highlight/30",
      };
  }
}

export function getTargetPesertaLabel(target: TargetPeserta) {
  switch (target) {
    case TargetPeserta.hanya_pj_pi:
      return "Khusus PJ & PI";
    case TargetPeserta.semua_panitia:
      return "Semua Panitia Proker";
    case TargetPeserta.semua_panitia_sto:
      return "Semua STO Satu Periode";
  }
}

export interface BarisPanitiaInput {
  stoId: number;
  peran?: PeranPanitia;
  peranTeks?: string;
  divisiPanitia?: string | null;
}

export interface CsvBarisPanitia {
  nama?: string;
  nim?: string;
  peran?: string;
  divisiPanitia?: string;
}
