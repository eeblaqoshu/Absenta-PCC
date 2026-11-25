// lib/actions/adsek.ts
// Server action untuk pengelolaan akun Adsek / PI (tambah, ubah, hapus)
"use server";

import { prisma } from "@/lib/prisma";
import { requireAdsek } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { RoleAdsek } from "@prisma/client";
import { z } from "zod";

const TambahAdsekSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid").toLowerCase(),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  role: z.nativeEnum(RoleAdsek, {
    message: "Peran tidak valid",
  }),
});

const UbahAdsekSchema = z.object({
  id: z.coerce.number().int().positive("ID akun tidak valid"),
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid").toLowerCase(),
  password: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val === "" || val.length >= 6, {
      message: "Kata sandi baru minimal 6 karakter jika ingin diubah",
    })
    .optional(),
  role: z.nativeEnum(RoleAdsek, {
    message: "Peran tidak valid",
  }),
});

export interface ActionResponse {
  sukses?: boolean;
  pesan?: string;
  error?: {
    kode: string;
    pesan: string;
  };
}

/**
 * Menambahkan akun Adsek / PI baru.
 * Membuat pengguna di Firebase Authentication dan menyimpan data di tabel akun_adsek MySQL.
 */
export async function tambahAdsekAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResponse> {
  try {
    // 1. Verifikasi hak akses (hanya admin yang berhak mengelola akun adsek)
    await requireAdsek([RoleAdsek.admin]);

    // 2. Parse & validasi input
    const rawData = {
      nama: formData.get("nama") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
    };

    const parsed = TambahAdsekSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: parsed.error.issues[0]?.message || "Input form tidak valid",
        },
      };
    }

    const { nama, email, password, role } = parsed.data;

    // 3. Cek duplikasi email di tabel akun_adsek
    const emailExist = await prisma.akunAdsek.findUnique({
      where: { email },
    });

    if (emailExist) {
      return {
        error: {
          kode: "EMAIL_SUDAH_TERDAFTAR",
          pesan: `Alamat email "${email}" sudah digunakan oleh akun pengelola lain.`,
        },
      };
    }

    // 4. Sinkronisasi pembuatan akun di Firebase Authentication
    let firebaseUid: string | null = null;
    if (adminAuth) {
      try {
        const user = await adminAuth.createUser({
          email,
          password,
          displayName: nama,
          emailVerified: true,
        });
        firebaseUid = user.uid;
      } catch (fbErr: unknown) {
        const msg = fbErr instanceof Error ? fbErr.message : String(fbErr);
        // Jika user sudah ada di Firebase, gunakan UID yang ada dan perbarui passwordnya
        if (msg.includes("email-already-exists") || msg.includes("auth/email-already-exists")) {
          try {
            const existingFbUser = await adminAuth.getUserByEmail(email);
            await adminAuth.updateUser(existingFbUser.uid, {
              password,
              displayName: nama,
              emailVerified: true,
            });
            firebaseUid = existingFbUser.uid;
          } catch (updateFbErr: unknown) {
            console.error("Gagal sinkronisasi user Firebase yang ada:", updateFbErr);
          }
        } else {
          console.error("Gagal membuat user di Firebase Auth:", fbErr);
          return {
            error: {
              kode: "FIREBASE_ERROR",
              pesan: `Gagal mendaftarkan akun di Firebase Auth: ${msg}`,
            },
          };
        }
      }
    }

    // 5. Simpan ke database MySQL
    await prisma.akunAdsek.create({
      data: {
        nama,
        email,
        role,
        firebaseUid,
      },
    });

    revalidatePath("/dashboard/profil");
    return {
      sukses: true,
      pesan: `Akun adsek "${nama}" berhasil dibuat.`,
    };
  } catch (err: unknown) {
    console.error("Error tambahAdsekAction:", err);
    return {
      error: {
        kode: "INTERNAL_ERROR",
        pesan:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan internal saat membuat akun adsek.",
      },
    };
  }
}

/**
 * Memperbarui akun Adsek / PI yang sudah ada.
 */
export async function ubahAdsekAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResponse> {
  try {
    // 1. Verifikasi hak akses admin
    await requireAdsek([RoleAdsek.admin]);

    // 2. Parse & validasi input
    const rawData = {
      id: formData.get("id"),
      nama: formData.get("nama") as string,
      email: formData.get("email") as string,
      password: (formData.get("password") as string) || "",
      role: formData.get("role") as string,
    };

    const parsed = UbahAdsekSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: parsed.error.issues[0]?.message || "Input form tidak valid",
        },
      };
    }

    const { id, nama, email, password, role } = parsed.data;

    // 3. Ambil data akun yang lama
    const targetAdsek = await prisma.akunAdsek.findUnique({
      where: { id },
    });

    if (!targetAdsek) {
      return {
        error: {
          kode: "NOT_FOUND",
          pesan: "Data akun adsek tidak ditemukan.",
        },
      };
    }

    // 4. Jika mengubah email, pastikan email baru belum dipakai akun lain
    if (email !== targetAdsek.email) {
      const emailDipakai = await prisma.akunAdsek.findUnique({
        where: { email },
      });
      if (emailDipakai) {
        return {
          error: {
            kode: "EMAIL_TERDAFTAR",
            pesan: `Email "${email}" sudah digunakan oleh akun lain.`,
          },
        };
      }
    }

    // 5. Jika akun saat ini adalah admin dan diubah perannya menjadi non-admin,
    // pastikan masih ada admin lain di sistem
    if (targetAdsek.role === RoleAdsek.admin && role !== RoleAdsek.admin) {
      const totalAdmin = await prisma.akunAdsek.count({
        where: { role: RoleAdsek.admin },
      });
      if (totalAdmin <= 1) {
        return {
          error: {
            kode: "ADMIN_TERAKHIR",
            pesan:
              "Tidak dapat mengubah peran admin terakhir. Sistem wajib memiliki minimal satu akun admin.",
          },
        };
      }
    }

    // 6. Sinkronisasi perubahan ke Firebase Auth
    let firebaseUid = targetAdsek.firebaseUid;
    if (adminAuth) {
      try {
        if (firebaseUid) {
          const updateData: {
            displayName: string;
            email?: string;
            password?: string;
          } = {
            displayName: nama,
          };
          if (email !== targetAdsek.email) {
            updateData.email = email;
          }
          if (password && password.length >= 6) {
            updateData.password = password;
          }
          await adminAuth.updateUser(firebaseUid, updateData);
        } else {
          // Cari user di Firebase berdasarkan email lama atau baru
          try {
            const userFb = await adminAuth.getUserByEmail(targetAdsek.email);
            firebaseUid = userFb.uid;
            await adminAuth.updateUser(firebaseUid, {
              displayName: nama,
              email,
              ...(password && password.length >= 6 ? { password } : {}),
            });
          } catch {
            // Jika belum ada di Firebase, buat user baru
            if (password && password.length >= 6) {
              const newFb = await adminAuth.createUser({
                email,
                password,
                displayName: nama,
                emailVerified: true,
              });
              firebaseUid = newFb.uid;
            }
          }
        }
      } catch (fbErr: unknown) {
        console.warn("Gagal memperbarui data di Firebase Auth:", fbErr);
      }
    }

    // 7. Simpan pembaruan ke MySQL
    await prisma.akunAdsek.update({
      where: { id },
      data: {
        nama,
        email,
        role,
        firebaseUid,
      },
    });

    revalidatePath("/dashboard/profil");
    return {
      sukses: true,
      pesan: `Data akun "${nama}" berhasil diperbarui.`,
    };
  } catch (err: unknown) {
    console.error("Error ubahAdsekAction:", err);
    return {
      error: {
        kode: "INTERNAL_ERROR",
        pesan:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan internal saat memperbarui akun adsek.",
      },
    };
  }
}

/**
 * Menghapus akun Adsek / PI.
 */
export async function hapusAdsekAction(id: number): Promise<ActionResponse> {
  try {
    // 1. Verifikasi hak akses admin
    const currentAdsek = await requireAdsek([RoleAdsek.admin]);

    // 2. Cegah menghapus akun sendiri
    if (currentAdsek.id === id) {
      return {
        error: {
          kode: "AKUN_SENDIRI",
          pesan: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.",
        },
      };
    }

    // 3. Ambil data akun target
    const targetAdsek = await prisma.akunAdsek.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            prokerDibuat: true,
            agendaDibuat: true,
            sesiDibuat: true,
            lokasiDibuat: true,
            izinDitinjau: true,
          },
        },
      },
    });

    if (!targetAdsek) {
      return {
        error: {
          kode: "NOT_FOUND",
          pesan: "Data akun adsek tidak ditemukan atau sudah dihapus.",
        },
      };
    }

    // 4. Cegah menghapus admin terakhir
    if (targetAdsek.role === RoleAdsek.admin) {
      const totalAdmin = await prisma.akunAdsek.count({
        where: { role: RoleAdsek.admin },
      });
      if (totalAdmin <= 1) {
        return {
          error: {
            kode: "ADMIN_TERAKHIR",
            pesan:
              "Tidak dapat menghapus admin terakhir. Sistem wajib memiliki minimal satu akun admin.",
          },
        };
      }
    }

    // 5. Cek keterikatan data relasi agar integritas data kepengurusan tetap utuh
    const { prokerDibuat, agendaDibuat, sesiDibuat } = targetAdsek._count;
    if (prokerDibuat > 0 || agendaDibuat > 0 || sesiDibuat > 0) {
      return {
        error: {
          kode: "TERIKAT_DATA",
          pesan: `Akun "${targetAdsek.nama}" tidak dapat dihapus karena telah tercatat membuat riwayat data (${prokerDibuat} proker, ${agendaDibuat} agenda, ${sesiDibuat} sesi presensi).`,
        },
      };
    }

    // 6. Hapus dari Firebase Auth jika UID tersedia
    if (adminAuth && targetAdsek.firebaseUid) {
      try {
        await adminAuth.deleteUser(targetAdsek.firebaseUid);
      } catch (fbErr: unknown) {
        console.warn("Gagal menghapus user di Firebase Auth:", fbErr);
      }
    }

    // 7. Hapus dari database MySQL
    await prisma.akunAdsek.delete({
      where: { id },
    });

    revalidatePath("/dashboard/profil");
    return {
      sukses: true,
      pesan: `Akun adsek "${targetAdsek.nama}" berhasil dihapus.`,
    };
  } catch (err: unknown) {
    console.error("Error hapusAdsekAction:", err);
    return {
      error: {
        kode: "INTERNAL_ERROR",
        pesan:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan internal saat menghapus akun adsek.",
      },
    };
  }
}
