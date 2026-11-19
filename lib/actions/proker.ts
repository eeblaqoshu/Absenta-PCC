// lib/actions/proker.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StatusPeriode, PeranPanitia } from "@prisma/client";

const BuatProkerSchema = z.object({
  nama: z.string().min(3, "Nama proker minimal 3 karakter"),
  deskripsi: z.string().optional().nullable(),
});

const TambahPanitiaSchema = z.object({
  prokerId: z.coerce.number(),
  stoId: z.coerce.number(),
  peran: z.nativeEnum(PeranPanitia),
  divisiPanitia: z.string().optional().nullable(),
});

export async function buatProkerAction(prevState: unknown, formData: FormData) {
  try {
    const adsek = await requireAdsek();

    const periodeAktif = await prisma.periode.findFirst({
      where: { status: StatusPeriode.aktif },
    });

    if (!periodeAktif) {
      return {
        error: {
          kode: "PERIODE_TIDAK_AKTIF",
          pesan: "Tidak ada periode aktif. Proker hanya dapat dibuat pada periode aktif.",
        },
      };
    }

    const rawData = {
      nama: formData.get("nama") as string,
      deskripsi: (formData.get("deskripsi") as string) || null,
    };

    const parsed = BuatProkerSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: parsed.error.issues[0].message,
        },
      };
    }

    await prisma.proker.create({
      data: {
        periodeId: periodeAktif.id,
        nama: parsed.data.nama,
        deskripsi: parsed.data.deskripsi,
        dibuatOleh: adsek.id,
      },
    });

    revalidatePath("/dashboard/proker");
    revalidatePath("/dashboard");
    return { sukses: true, pesan: "Program kerja berhasil dibuat" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal membuat program kerja",
      },
    };
  }
}

export async function ubahProkerAction(prokerId: number, formData: FormData) {
  try {
    await requireAdsek();

    const proker = await prisma.proker.findUnique({
      where: { id: prokerId },
      include: { periode: true },
    });

    if (!proker) {
      return {
        error: {
          kode: "TIDAK_DITEMUKAN",
          pesan: "Program kerja tidak ditemukan",
        },
      };
    }

    // Aturan bisnis: periode selesai bersifat read-only
    if (proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_SELESAI",
          pesan: "Tidak dapat mengubah proker karena periode sudah selesai (read-only)",
        },
      };
    }

    const rawData = {
      nama: formData.get("nama") as string,
      deskripsi: (formData.get("deskripsi") as string) || null,
    };

    const parsed = BuatProkerSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: parsed.error.issues[0].message,
        },
      };
    }

    await prisma.proker.update({
      where: { id: prokerId },
      data: {
        nama: parsed.data.nama,
        deskripsi: parsed.data.deskripsi,
      },
    });

    revalidatePath(`/dashboard/proker/${prokerId}`);
    revalidatePath("/dashboard/proker");
    return { sukses: true, pesan: "Program kerja berhasil diperbarui" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal mengubah program kerja",
      },
    };
  }
}

export async function hapusProkerAction(prokerId: number) {
  try {
    await requireAdsek();

    const proker = await prisma.proker.findUnique({
      where: { id: prokerId },
      include: {
        periode: true,
        agenda: {
          include: { sesi: true },
        },
      },
    });

    if (!proker) {
      return {
        error: {
          kode: "TIDAK_DITEMUKAN",
          pesan: "Program kerja tidak ditemukan",
        },
      };
    }

    if (proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_SELESAI",
          pesan: "Periode ini sudah selesai dan berstatus read-only",
        },
      };
    }

    // Periksa apakah sudah ada sesi presensi pada agenda proker ini
    const totalSesi = proker.agenda.reduce((acc, a) => acc + a.sesi.length, 0);
    if (totalSesi > 0) {
      return {
        error: {
          kode: "MEMILIKI_SESI_PRESENSI",
          pesan: "Proker tidak dapat dihapus karena sudah memiliki sesi presensi",
        },
      };
    }

    // Hapus kepanitiaan dan agenda terkait dalam transaksi
    await prisma.$transaction(async (tx) => {
      await tx.kepanitiaan.deleteMany({ where: { prokerId } });
      await tx.agenda.deleteMany({ where: { prokerId } });
      await tx.proker.delete({ where: { id: prokerId } });
    });

    revalidatePath("/dashboard/proker");
    revalidatePath("/dashboard");
    return { sukses: true, pesan: "Program kerja berhasil dihapus" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal menghapus program kerja",
      },
    };
  }
}

// ─────────────────────────────────────────────
// KEPANITIAAN ACTIONS
// ─────────────────────────────────────────────

export async function tambahPanitiaAction(formData: FormData) {
  try {
    await requireAdsek();

    const rawData = {
      prokerId: formData.get("prokerId"),
      stoId: formData.get("stoId"),
      peran: formData.get("peran"),
      divisiPanitia: (formData.get("divisiPanitia") as string) || null,
    };

    const parsed = TambahPanitiaSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: parsed.error.issues[0].message,
        },
      };
    }

    const { prokerId, stoId, peran, divisiPanitia } = parsed.data;

    // Cek proker dan status periodenya
    const proker = await prisma.proker.findUnique({
      where: { id: prokerId },
      include: { periode: true },
    });

    if (!proker || proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah kepanitiaan pada periode yang sudah selesai",
        },
      };
    }

    // Cek apakah STO sudah terdaftar di kepanitiaan proker ini
    const existing = await prisma.kepanitiaan.findUnique({
      where: {
        prokerId_stoId: {
          prokerId,
          stoId,
        },
      },
    });

    if (existing) {
      return {
        error: {
          kode: "SUDAH_TERDAFTAR",
          pesan: "Pengurus ini sudah terdaftar dalam kepanitiaan proker ini",
        },
      };
    }

    await prisma.kepanitiaan.create({
      data: {
        prokerId,
        stoId,
        peran,
        divisiPanitia,
      },
    });

    revalidatePath(`/dashboard/proker/${prokerId}`);
    return { sukses: true, pesan: "Panitia berhasil ditambahkan" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal menambahkan panitia",
      },
    };
  }
}

export interface BarisPanitiaInput {
  stoId: number;
  peran: PeranPanitia;
  divisiPanitia?: string | null;
}

/**
 * Tambah banyak panitia sekaligus dalam satu submit (Batch/Struktur Form).
 */
export async function tambahBanyakPanitiaAction(
  prokerId: number,
  panitiaList: BarisPanitiaInput[]
) {
  try {
    await requireAdsek();

    if (!panitiaList || panitiaList.length === 0) {
      return {
        error: {
          kode: "DATA_KOSONG",
          pesan: "Daftar susunan panitia tidak boleh kosong.",
        },
      };
    }

    const proker = await prisma.proker.findUnique({
      where: { id: prokerId },
      include: { periode: true },
    });

    if (!proker || proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah kepanitiaan pada periode yang sudah selesai (read-only).",
        },
      };
    }

    // Ambil STO yang sudah terdaftar di proker ini
    const existing = await prisma.kepanitiaan.findMany({
      where: { prokerId },
      select: { stoId: true },
    });
    const existingStoSet = new Set(existing.map((e) => e.stoId));

    // Validasi STO di periode yang sama
    const validStos = await prisma.sto.findMany({
      where: {
        periodeId: proker.periodeId,
        id: { in: panitiaList.map((p) => p.stoId) },
      },
      select: { id: true, nama: true },
    });
    const validStoMap = new Map(validStos.map((s) => [s.id, s.nama]));

    const seenInBatch = new Set<number>();
    const dataValid: {
      prokerId: number;
      stoId: number;
      peran: PeranPanitia;
      divisiPanitia: string | null;
    }[] = [];

    const pesanGagal: string[] = [];

    for (let i = 0; i < panitiaList.length; i++) {
      const item = panitiaList[i];
      const no = i + 1;

      if (!item.stoId) {
        pesanGagal.push(`Baris ${no}: Pengurus STO belum dipilih.`);
        continue;
      }

      const namaSto = validStoMap.get(item.stoId);
      if (!namaSto) {
        pesanGagal.push(`Baris ${no}: Pengurus tidak valid atau bukan pengurus di periode aktif ini.`);
        continue;
      }

      if (existingStoSet.has(item.stoId)) {
        pesanGagal.push(`Baris ${no}: ${namaSto} sudah terdaftar dalam kepanitiaan.`);
        continue;
      }

      if (seenInBatch.has(item.stoId)) {
        pesanGagal.push(`Baris ${no}: Duplikasi pengurus ${namaSto} di dalam form.`);
        continue;
      }

      if (!Object.values(PeranPanitia).includes(item.peran)) {
        pesanGagal.push(`Baris ${no}: Peran tidak valid untuk ${namaSto}.`);
        continue;
      }

      seenInBatch.add(item.stoId);
      dataValid.push({
        prokerId,
        stoId: item.stoId,
        peran: item.peran,
        divisiPanitia: item.divisiPanitia?.trim() || null,
      });
    }

    if (dataValid.length === 0) {
      return {
        error: {
          kode: "TIDAK_ADA_DATA_VALID",
          pesan: pesanGagal.join(" ") || "Tidak ada data panitia valid untuk disimpan.",
        },
      };
    }

    await prisma.kepanitiaan.createMany({
      data: dataValid,
    });

    revalidatePath(`/dashboard/proker/${prokerId}`);
    return {
      sukses: true,
      totalBerhasil: dataValid.length,
      totalGagal: pesanGagal.length,
      pesanGagal,
      pesan: `${dataValid.length} panitia berhasil ditambahkan ke susunan kepanitiaan.`,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal menambahkan susunan panitia",
      },
    };
  }
}

export interface CsvBarisPanitia {
  nim: string;
  peran?: string;
  divisiPanitia?: string;
}

const DAFTAR_21_PERAN: { key: string; label: string; peran: PeranPanitia }[] = [
  { key: "ketua_pelaksana", label: "Ketua Pelaksana", peran: PeranPanitia.ketua },
  { key: "wakil_ketua_pelaksana", label: "Wakil Ketua Pelaksana", peran: PeranPanitia.ketua },
  { key: "sekretaris_inti", label: "Sekretaris Inti", peran: PeranPanitia.sekretaris },
  { key: "sekretaris_pelaksana", label: "Sekretaris Pelaksana", peran: PeranPanitia.sekretaris },
  { key: "bendahara_inti", label: "Bendahara Inti", peran: PeranPanitia.bendahara },
  { key: "bendahara_pelaksana", label: "Bendahara Pelaksana", peran: PeranPanitia.bendahara },
  { key: "litbang_pengawas", label: "Litbang Pengawas", peran: PeranPanitia.pj_divisi },
  { key: "pj_sie_acara", label: "Penanggung Jawab Sie Acara", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_acara", label: "Anggota Sie Acara", peran: PeranPanitia.anggota },
  { key: "pj_sie_dekdok", label: "Penanggung Jawab Sie Dekdok", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_dekdok", label: "Anggota Sie Dekdok", peran: PeranPanitia.anggota },
  { key: "pj_sie_humas", label: "Penanggung Jawab Sie Humas", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_humas", label: "Anggota Sie Humas", peran: PeranPanitia.anggota },
  { key: "pj_sie_kreatif", label: "Penanggung Jawab Sie Kreatif", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_kreatif", label: "Anggota Sie Kreatif", peran: PeranPanitia.anggota },
  { key: "pj_sie_perkap", label: "Penanggung Jawab Sie Perkap", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_perkap", label: "Anggota Sie Perkap", peran: PeranPanitia.anggota },
  { key: "pj_sie_konsumsi", label: "Penanggung Jawab Sie Konsumsi", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_konsumsi", label: "Anggota Sie Konsumsi", peran: PeranPanitia.anggota },
  { key: "pj_sie_dekdokre", label: "Penanggung Jawab Sie Dekdokre", peran: PeranPanitia.pj_divisi },
  { key: "anggota_sie_dekdokre", label: "Anggota Sie Dekdokre", peran: PeranPanitia.anggota },
];

function normalisasiPeranPanitia(peranInput?: string, divisiInput?: string): {
  peran: PeranPanitia;
  divisiPanitia: string;
} {
  const p = (peranInput || "").trim().toLowerCase();
  const d = (divisiInput || "").trim();

  // 1. Cek kecocokan persis pada daftar 21 peran (baik dari kolom peran maupun divisi)
  const matched = DAFTAR_21_PERAN.find(
    (item) =>
      item.key === p ||
      item.label.toLowerCase() === p ||
      item.label.toLowerCase() === d.toLowerCase(),
  );
  if (matched) {
    return { peran: matched.peran, divisiPanitia: matched.label };
  }

  // 2. Cek pimpinan inti & litbang dengan variasi teks
  if (p.includes("wakil ketua")) return { peran: PeranPanitia.ketua, divisiPanitia: "Wakil Ketua Pelaksana" };
  if (p === "ketua_pelaksana" || p === "ketua pelaksana") return { peran: PeranPanitia.ketua, divisiPanitia: "Ketua Pelaksana" };
  if (p === "sekretaris_inti" || p === "sekretaris inti") return { peran: PeranPanitia.sekretaris, divisiPanitia: "Sekretaris Inti" };
  if (p === "sekretaris_pelaksana" || p === "sekretaris pelaksana") return { peran: PeranPanitia.sekretaris, divisiPanitia: "Sekretaris Pelaksana" };
  if (p === "bendahara_inti" || p === "bendahara inti") return { peran: PeranPanitia.bendahara, divisiPanitia: "Bendahara Inti" };
  if (p === "bendahara_pelaksana" || p === "bendahara pelaksana") return { peran: PeranPanitia.bendahara, divisiPanitia: "Bendahara Pelaksana" };
  if (p.includes("litbang") || p.includes("pengawas")) return { peran: PeranPanitia.pj_divisi, divisiPanitia: "Litbang Pengawas" };

  // 3. Cek nilai enum persis
  if (p === "ketua") return { peran: PeranPanitia.ketua, divisiPanitia: d || "Ketua Pelaksana" };
  if (p === "sekretaris") return { peran: PeranPanitia.sekretaris, divisiPanitia: d || "Sekretaris Pelaksana" };
  if (p === "bendahara") return { peran: PeranPanitia.bendahara, divisiPanitia: d || "Bendahara Pelaksana" };
  if (p === "pj_divisi" || p === "pj") return { peran: PeranPanitia.pj_divisi, divisiPanitia: d || "Penanggung Jawab" };
  if (p === "anggota") return { peran: PeranPanitia.anggota, divisiPanitia: d || "Anggota" };

  // 4. Cek keyword teks bebas
  const gabung = `${p} ${d.toLowerCase()}`;
  if (gabung.includes("ketua")) {
    return { peran: PeranPanitia.ketua, divisiPanitia: d || peranInput?.trim() || "Ketua Pelaksana" };
  }
  if (gabung.includes("sekretaris") || gabung.includes("sekre")) {
    return { peran: PeranPanitia.sekretaris, divisiPanitia: d || peranInput?.trim() || "Sekretaris Pelaksana" };
  }
  if (gabung.includes("bendahara") || gabung.includes("bendum")) {
    return { peran: PeranPanitia.bendahara, divisiPanitia: d || peranInput?.trim() || "Bendahara Pelaksana" };
  }
  if (gabung.includes("pj") || gabung.includes("koordinator") || gabung.includes("penanggung")) {
    return { peran: PeranPanitia.pj_divisi, divisiPanitia: d || peranInput?.trim() || "Penanggung Jawab" };
  }

  // Default anggota
  return {
    peran: PeranPanitia.anggota,
    divisiPanitia: d || peranInput?.trim() || "Anggota",
  };
}

/**
 * Impor susunan panitia proker massal dari baris file CSV.
 */
export async function imporCsvPanitiaAction(
  prokerId: number,
  barisList: CsvBarisPanitia[]
) {
  try {
    await requireAdsek();

    if (!barisList || barisList.length === 0) {
      return {
        error: {
          kode: "DATA_KOSONG",
          pesan: "Tidak ada data baris dalam file CSV.",
        },
      };
    }

    const proker = await prisma.proker.findUnique({
      where: { id: prokerId },
      include: { periode: true },
    });

    if (!proker || proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengimpor kepanitiaan pada periode yang sudah selesai (read-only).",
        },
      };
    }

    // Ambil semua STO pada periode ini
    const allStos = await prisma.sto.findMany({
      where: { periodeId: proker.periodeId },
      select: { id: true, nama: true, nim: true, emailGoogle: true },
    });

    const stoByNim = new Map<string, typeof allStos[0]>();
    const stoByEmail = new Map<string, typeof allStos[0]>();
    for (const s of allStos) {
      if (s.nim) stoByNim.set(s.nim.trim().toLowerCase(), s);
      if (s.emailGoogle) stoByEmail.set(s.emailGoogle.trim().toLowerCase(), s);
    }

    // Ambil kepanitiaan yang sudah ada
    const existing = await prisma.kepanitiaan.findMany({
      where: { prokerId },
      select: { stoId: true },
    });
    const existingStoSet = new Set(existing.map((e) => e.stoId));

    const pesanGagal: string[] = [];
    const seenStoId = new Set<number>();
    const dataValid: {
      prokerId: number;
      stoId: number;
      peran: PeranPanitia;
      divisiPanitia: string | null;
    }[] = [];

    for (let i = 0; i < barisList.length; i++) {
      const row = barisList[i];
      const noBaris = i + 2;

      const nimKey = row.nim?.trim().toLowerCase();
      if (!nimKey) {
        pesanGagal.push(`Baris ${noBaris}: Kolom NIM kosong.`);
        continue;
      }

      // Cocokkan ke STO berdasarkan NIM atau Email
      const stoMatch = stoByNim.get(nimKey) || stoByEmail.get(nimKey);
      if (!stoMatch) {
        pesanGagal.push(`Baris ${noBaris}: Pengurus dengan NIM/Email '${row.nim}' tidak ditemukan di periode proker ini.`);
        continue;
      }

      if (existingStoSet.has(stoMatch.id)) {
        pesanGagal.push(`Baris ${noBaris}: ${stoMatch.nama} (${stoMatch.nim}) sudah terdaftar dalam kepanitiaan.`);
        continue;
      }

      if (seenStoId.has(stoMatch.id)) {
        pesanGagal.push(`Baris ${noBaris}: Duplikasi pengurus ${stoMatch.nama} (${stoMatch.nim}) di dalam file CSV.`);
        continue;
      }

      const { peran, divisiPanitia } = normalisasiPeranPanitia(row.peran, row.divisiPanitia);

      seenStoId.add(stoMatch.id);
      dataValid.push({
        prokerId,
        stoId: stoMatch.id,
        peran,
        divisiPanitia,
      });
    }

    if (dataValid.length > 0) {
      await prisma.kepanitiaan.createMany({
        data: dataValid,
      });
    }

    revalidatePath(`/dashboard/proker/${prokerId}`);

    return {
      sukses: true,
      totalDiproses: barisList.length,
      totalBerhasil: dataValid.length,
      totalGagal: pesanGagal.length,
      pesanGagal,
      pesan: `Impor kepanitiaan selesai: ${dataValid.length} berhasil ditambahkan, ${pesanGagal.length} gagal/dilewati.`,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal memproses impor CSV kepanitiaan",
      },
    };
  }
}

export async function ubahPanitiaAction(kepanitiaanId: number, formData: FormData) {
  try {
    await requireAdsek();

    const kepanitiaan = await prisma.kepanitiaan.findUnique({
      where: { id: kepanitiaanId },
      include: { proker: { include: { periode: true } } },
    });

    if (!kepanitiaan || kepanitiaan.proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah data kepanitiaan pada periode yang selesai",
        },
      };
    }

    const peran = formData.get("peran") as PeranPanitia;
    const divisiPanitia = (formData.get("divisiPanitia") as string) || null;

    if (!Object.values(PeranPanitia).includes(peran)) {
      return {
        error: {
          kode: "PERAN_TIDAK_VALID",
          pesan: "Peran panitia tidak valid",
        },
      };
    }

    await prisma.kepanitiaan.update({
      where: { id: kepanitiaanId },
      data: {
        peran,
        divisiPanitia,
      },
    });

    revalidatePath(`/dashboard/proker/${kepanitiaan.prokerId}`);
    return { sukses: true, pesan: "Data panitia berhasil diperbarui" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal mengubah data panitia",
      },
    };
  }
}

export async function hapusPanitiaAction(kepanitiaanId: number) {
  try {
    await requireAdsek();

    const kepanitiaan = await prisma.kepanitiaan.findUnique({
      where: { id: kepanitiaanId },
      include: { proker: { include: { periode: true } } },
    });

    if (!kepanitiaan || kepanitiaan.proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat menghapus panitia pada periode selesai",
        },
      };
    }

    await prisma.kepanitiaan.delete({
      where: { id: kepanitiaanId },
    });

    revalidatePath(`/dashboard/proker/${kepanitiaan.prokerId}`);
    return { sukses: true, pesan: "Panitia berhasil dihapus dari proker" };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: {
        kode: "SERVER_ERROR",
        pesan: error.message || "Gagal menghapus panitia",
      },
    };
  }
}
