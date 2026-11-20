// lib/actions/kepanitiaan.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StatusPeriode, PeranPanitia } from "@prisma/client";
import {
  isDivisiLitbang,
  isPeranLitbangPengawas,
  normalisasiPeranPanitia,
  type BarisPanitiaInput,
  type CsvBarisPanitia,
} from "@/components/dashboard/proker-detail/types";

const TambahPanitiaSchema = z.object({
  prokerId: z.coerce.number(),
  stoId: z.coerce.number(),
  peran: z.nativeEnum(PeranPanitia),
  divisiPanitia: z.string().optional().nullable(),
});

export async function tambahPanitiaAction(formData: FormData) {
  try {
    await requireAdsek();

    const prokerId = Number(formData.get("prokerId"));
    const stoId = Number(formData.get("stoId"));
    if (!prokerId || !stoId) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: "Proker dan Pengurus STO wajib dipilih",
        },
      };
    }

    const peranMentah = (formData.get("peran") as string) || (formData.get("peranTeks") as string) || "";
    const divisiMentah = (formData.get("divisiPanitia") as string) || null;
    const norm = normalisasiPeranPanitia(peranMentah, divisiMentah || undefined);
    const peran = Object.values(PeranPanitia).includes(peranMentah as PeranPanitia)
      ? (peranMentah as PeranPanitia)
      : norm.peran;
    const divisiPanitia = divisiMentah?.trim() || peranMentah.trim() || norm.divisiPanitia;

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

    const sto = await prisma.sto.findUnique({
      where: { id: stoId },
      select: { id: true, nama: true, divisi: true, jabatan: true },
    });

    if (!sto) {
      return {
        error: {
          kode: "STO_TIDAK_DITEMUKAN",
          pesan: "Pengurus STO tidak ditemukan.",
        },
      };
    }

    if (isDivisiLitbang(sto) && !isPeranLitbangPengawas(null, divisiPanitia)) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: `Pengurus dari Divisi Litbang (${sto.nama}) hanya dapat ditugaskan sebagai Litbang Pengawas.`,
        },
      };
    }

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

    const existing = await prisma.kepanitiaan.findMany({
      where: { prokerId },
      select: { stoId: true },
    });
    const existingStoSet = new Set(existing.map((e) => e.stoId));

    const validStos = await prisma.sto.findMany({
      where: {
        periodeId: proker.periodeId,
        id: { in: panitiaList.map((p) => p.stoId) },
      },
      select: { id: true, nama: true, divisi: true, jabatan: true },
    });
    const validStoMap = new Map(validStos.map((s) => [s.id, s.nama]));
    const validStoObjMap = new Map(validStos.map((s) => [s.id, s]));

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
      const stoObj = validStoObjMap.get(item.stoId);
      if (!namaSto || !stoObj) {
        pesanGagal.push(`Baris ${no}: Pengurus tidak valid atau bukan pengurus di periode aktif ini.`);
        continue;
      }

      const teksPeran = (item.peranTeks || item.divisiPanitia || String(item.peran || "")).trim();
      const norm = normalisasiPeranPanitia(teksPeran, item.divisiPanitia || undefined);
      const peranFinal = item.peran && Object.values(PeranPanitia).includes(item.peran) ? item.peran : norm.peran;
      const divisiFinal = item.divisiPanitia?.trim() || teksPeran || norm.divisiPanitia;

      if (isDivisiLitbang(stoObj) && !isPeranLitbangPengawas(teksPeran, divisiFinal)) {
        pesanGagal.push(`Baris ${no}: Pengurus dari Divisi Litbang (${stoObj.nama}) hanya dapat ditugaskan sebagai Litbang Pengawas.`);
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

      seenInBatch.add(item.stoId);
      dataValid.push({
        prokerId,
        stoId: item.stoId,
        peran: peranFinal,
        divisiPanitia: divisiFinal || null,
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
    revalidatePath(`/dashboard/proker/${prokerId}/panitia`);
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

    const allStos = await prisma.sto.findMany({
      where: { periodeId: proker.periodeId },
      select: { id: true, nama: true, nim: true, emailGoogle: true, divisi: true, jabatan: true },
    });

    const stoByNama = new Map<string, typeof allStos[0]>();
    const stoByNim = new Map<string, typeof allStos[0]>();
    const stoByEmail = new Map<string, typeof allStos[0]>();
    for (const s of allStos) {
      if (s.nama) stoByNama.set(s.nama.trim().toLowerCase().replace(/\s+/g, " "), s);
      if (s.nim) stoByNim.set(s.nim.trim().toLowerCase(), s);
      if (s.emailGoogle) stoByEmail.set(s.emailGoogle.trim().toLowerCase(), s);
    }

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

      const identifier = (row.nama || row.nim || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!identifier) {
        pesanGagal.push(`Baris ${noBaris}: Kolom Nama kosong.`);
        continue;
      }

      const stoMatch =
        stoByNama.get(identifier) ||
        stoByNim.get(identifier) ||
        stoByEmail.get(identifier) ||
        allStos.find((s) => s.nama.trim().toLowerCase().replace(/\s+/g, " ") === identifier);

      if (!stoMatch) {
        pesanGagal.push(`Baris ${noBaris}: Pengurus '${row.nama || row.nim}' tidak ditemukan di periode proker ini.`);
        continue;
      }

      if (existingStoSet.has(stoMatch.id)) {
        pesanGagal.push(`Baris ${noBaris}: ${stoMatch.nama} sudah terdaftar dalam kepanitiaan.`);
        continue;
      }

      if (seenStoId.has(stoMatch.id)) {
        pesanGagal.push(`Baris ${noBaris}: Duplikasi pengurus ${stoMatch.nama} di dalam file CSV.`);
        continue;
      }

      const { peran, divisiPanitia } = normalisasiPeranPanitia(row.peran, row.divisiPanitia);

      if (isDivisiLitbang(stoMatch) && !isPeranLitbangPengawas(row.peran, divisiPanitia)) {
        pesanGagal.push(`Baris ${noBaris}: Pengurus dari Divisi Litbang (${stoMatch.nama}) hanya dapat ditugaskan sebagai Litbang Pengawas.`);
        continue;
      }

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
      include: {
        proker: { include: { periode: true } },
        sto: true,
      },
    });

    if (!kepanitiaan || kepanitiaan.proker.periode.status === StatusPeriode.selesai) {
      return {
        error: {
          kode: "PERIODE_READ_ONLY",
          pesan: "Tidak dapat mengubah data kepanitiaan pada periode yang selesai",
        },
      };
    }

    const peranMentah = (formData.get("peran") as string) || (formData.get("peranTeks") as string) || "";
    const divisiInput = (formData.get("divisiPanitia") as string) || null;
    const norm = normalisasiPeranPanitia(peranMentah, divisiInput || undefined);
    const peran = Object.values(PeranPanitia).includes(peranMentah as PeranPanitia)
      ? (peranMentah as PeranPanitia)
      : norm.peran;
    const divisiPanitia = divisiInput?.trim() || peranMentah.trim() || norm.divisiPanitia;

    // Periksa apakah STO diubah
    const stoIdInput = formData.get("stoId");
    const newStoId = stoIdInput ? parseInt(String(stoIdInput), 10) : kepanitiaan.stoId;
    if (isNaN(newStoId) || newStoId <= 0) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: "ID STO tidak valid",
        },
      };
    }

    let targetSto = kepanitiaan.sto;
    if (newStoId !== kepanitiaan.stoId) {
      const stoBaru = await prisma.sto.findUnique({
        where: { id: newStoId },
      });
      if (!stoBaru || stoBaru.periodeId !== kepanitiaan.proker.periodeId) {
        return {
          error: {
            kode: "STO_TIDAK_DITEMUKAN",
            pesan: "Pengurus STO baru tidak ditemukan atau bukan bagian dari periode aktif ini",
          },
        };
      }

      // Pastikan STO baru belum terdaftar di kepanitiaan proker ini
      const duplikat = await prisma.kepanitiaan.findUnique({
        where: {
          prokerId_stoId: {
            prokerId: kepanitiaan.prokerId,
            stoId: newStoId,
          },
        },
      });
      if (duplikat && duplikat.id !== kepanitiaanId) {
        return {
          error: {
            kode: "STO_SUDAH_PANITIA",
            pesan: `Pengurus ${stoBaru.nama} sudah terdaftar dalam susunan panitia proker ini`,
          },
        };
      }

      targetSto = stoBaru;
    }

    if (isDivisiLitbang(targetSto) && !isPeranLitbangPengawas(null, divisiPanitia)) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: `Pengurus dari Divisi Litbang (${targetSto.nama}) hanya dapat ditugaskan sebagai Litbang Pengawas.`,
        },
      };
    }

    await prisma.kepanitiaan.update({
      where: { id: kepanitiaanId },
      data: {
        stoId: targetSto.id,
        peran,
        divisiPanitia,
      },
    });

    revalidatePath(`/dashboard/proker/${kepanitiaan.prokerId}`);
    revalidatePath(`/dashboard/proker/${kepanitiaan.prokerId}/panitia`);
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
    revalidatePath(`/dashboard/proker/${kepanitiaan.prokerId}/panitia`);
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
