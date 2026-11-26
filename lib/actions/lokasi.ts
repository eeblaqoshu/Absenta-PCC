// lib/actions/lokasi.ts
// CRUD master lokasi presensi (titik pusat + radius) yang dipakai saat membuat sesi.
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const LokasiInputSchema = z.object({
  nama: z.string().min(3, "Nama lokasi minimal 3 karakter").max(120, "Nama lokasi maksimal 120 karakter"),
  lat: z.coerce.number().min(-90, "Latitude minimal -90").max(90, "Latitude maksimal 90"),
  lng: z.coerce.number().min(-180, "Longitude minimal -180").max(180, "Longitude maksimal 180"),
  radiusM: z.coerce
    .number()
    .int("Radius harus bilangan bulat")
    .min(10, "Radius minimal 10 meter")
    .max(5000, "Radius maksimal 5000 meter"),
});

function bacaForm(formData: FormData) {
  return {
    nama: (formData.get("nama") as string)?.trim(),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    radiusM: formData.get("radiusM") || 500,
  };
}

function kodeErrorPrisma(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : "";
}

export async function tambahLokasiAction(prevState: unknown, formData: FormData) {
  try {
    const adsek = await requireAdsek(["admin", "sekretaris_inti"]);

    const parsed = LokasiInputSchema.safeParse(bacaForm(formData));
    if (!parsed.success) {
      return {
        error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message },
      };
    }

    const { nama, lat, lng, radiusM } = parsed.data;

    await prisma.lokasi.create({
      data: { nama, lat, lng, radiusM, dibuatOleh: adsek.id },
    });

    revalidatePath("/dashboard/lokasi");
    return { sukses: true, pesan: `Lokasi "${nama}" berhasil didaftarkan` };
  } catch (err: unknown) {
    if (kodeErrorPrisma(err) === "P2002") {
      return {
        error: { kode: "NAMA_SUDAH_DIPAKAI", pesan: "Nama lokasi sudah terdaftar" },
      };
    }
    const error = err as Error;
    return {
      error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal menambah lokasi" },
    };
  }
}

export async function ubahLokasiAction(lokasiId: number, formData: FormData) {
  try {
    await requireAdsek(["admin", "sekretaris_inti"]);

    const parsed = LokasiInputSchema.safeParse(bacaForm(formData));
    if (!parsed.success) {
      return {
        error: { kode: "VALIDASI_GAGAL", pesan: parsed.error.issues[0].message },
      };
    }

    const { nama, lat, lng, radiusM } = parsed.data;

    await prisma.lokasi.update({
      where: { id: lokasiId },
      data: { nama, lat, lng, radiusM },
    });

    revalidatePath("/dashboard/lokasi");
    return { sukses: true, pesan: `Lokasi "${nama}" berhasil diperbarui` };
  } catch (err: unknown) {
    if (kodeErrorPrisma(err) === "P2002") {
      return {
        error: { kode: "NAMA_SUDAH_DIPAKAI", pesan: "Nama lokasi sudah dipakai lokasi lain" },
      };
    }
    const error = err as Error;
    return {
      error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal mengubah lokasi" },
    };
  }
}

export async function hapusLokasiAction(lokasiId: number) {
  try {
    await requireAdsek(["admin", "sekretaris_inti"]);

    const lokasi = await prisma.lokasi.findUnique({
      where: { id: lokasiId },
      include: { _count: { select: { agenda: true } } },
    });

    if (!lokasi) {
      return {
        error: { kode: "TIDAK_DITEMUKAN", pesan: "Lokasi tidak ditemukan" },
      };
    }

    // Agenda menyimpan salinan lat/lng/radius sendiri, jadi menghapus master
    // lokasi tidak mengubah validasi presensi agenda yang sudah dibuat
    // (FK di-set NULL oleh database).
    await prisma.lokasi.delete({ where: { id: lokasiId } });

    revalidatePath("/dashboard/lokasi");
    return {
      sukses: true,
      pesan:
        lokasi._count.agenda > 0
          ? `Lokasi "${lokasi.nama}" dihapus. ${lokasi._count.agenda} agenda terkait tetap memakai koordinat salinannya.`
          : `Lokasi "${lokasi.nama}" berhasil dihapus`,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      error: { kode: "SERVER_ERROR", pesan: error.message || "Gagal menghapus lokasi" },
    };
  }
}
