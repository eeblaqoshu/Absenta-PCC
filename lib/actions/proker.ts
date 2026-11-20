// lib/actions/proker.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StatusPeriode } from "@prisma/client";


const BuatProkerSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  kategori: z.enum(["proker", "agenda"]).default("proker"),
  deskripsi: z.string().optional().nullable(),
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
      kategori: (formData.get("kategori") as string) || "proker",
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
        kategori: parsed.data.kategori,
        deskripsi: parsed.data.deskripsi,
        dibuatOleh: adsek.id,
      },
    });

    revalidatePath("/dashboard/proker");
    revalidatePath("/dashboard");
    const label = parsed.data.kategori === "agenda" ? "Agenda" : "Program kerja";
    return { sukses: true, pesan: `${label} berhasil dibuat` };
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
      kategori: (formData.get("kategori") as string) || "proker",
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
        kategori: parsed.data.kategori,
        deskripsi: parsed.data.deskripsi,
      },
    });

    revalidatePath(`/dashboard/proker/${prokerId}`);
    revalidatePath("/dashboard/proker");
    const label = parsed.data.kategori === "agenda" ? "Agenda" : "Program kerja";
    return { sukses: true, pesan: `${label} berhasil diperbarui` };
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
