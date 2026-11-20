// scripts/create-adsek.ts
// Skrip untuk membuat atau mereset password akun Adsek di Firebase Authentication
import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { PrismaClient, RoleAdsek } from "@prisma/client";

// Baca file .env secara manual jika dijalankan mandiri
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    console.error("Gagal membaca .env:", err);
  }
}

loadEnv();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Environment variable Firebase Admin tidak lengkap di .env");
  process.exit(1);
}

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      })
    : getApps()[0];

const auth = getAuth(app);

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();
  const targetPassword = process.argv[3];
  const targetNama = process.argv[4] || "Administrator PCC";
  const targetRoleArg = process.argv[5]?.toLowerCase();
  const targetRole =
    targetRoleArg === "sekretaris_umum"
      ? RoleAdsek.sekretaris_umum
      : targetRoleArg === "sekretaris_inti"
        ? RoleAdsek.sekretaris_inti
        : RoleAdsek.admin;

  if (!targetEmail || !targetPassword) {
    console.error("\n❌ Argumen email dan password wajib diisi demi keamanan!");
    console.error("   Format: npx tsx scripts/create-adsek.ts <email> <password> [nama] [role]");
    console.error("   Contoh: npx tsx scripts/create-adsek.ts admin@organisasi.id SandiKuat123# \"Admin Utama\" admin\n");
    process.exit(1);
  }

  console.log(`\n🔐 Menyiapkan akun Adsek: ${targetEmail}`);
  console.log(`🔑 Password telah disetel untuk akun tersebut.\n`);

  try {
    // 1. Cek apakah user sudah ada di Firebase Auth
    let user;
    try {
      user = await auth.getUserByEmail(targetEmail);
      console.log(`ℹ️ User Firebase ditemukan (UID: ${user.uid}), memperbarui password...`);
      await auth.updateUser(user.uid, {
        password: targetPassword,
        displayName: targetNama,
        emailVerified: true,
      });
      console.log("✅ Password Firebase berhasil diperbarui!");
    } catch {
      console.log("ℹ️ User belum ada di Firebase, membuat user baru...");
      user = await auth.createUser({
        email: targetEmail,
        password: targetPassword,
        displayName: targetNama,
        emailVerified: true,
      });
      console.log(`✅ User Firebase baru berhasil dibuat! (UID: ${user.uid})`);
    }

    // 2. Hubungkan ke database MySQL
    const adsekDb = await prisma.akunAdsek.upsert({
      where: { email: targetEmail },
      update: {
        firebaseUid: user.uid,
        role: targetRole,
      },
      create: {
        nama: targetNama,
        email: targetEmail,
        firebaseUid: user.uid,
        role: targetRole,
      },
    });

    console.log(`✅ Akun DB berhasil disinkronkan: ${adsekDb.nama} (${adsekDb.role})\n`);
    console.log("───────────────────────────────────────────────");
    console.log("🎉 ANDA SEKARANG BISA LOGIN KE DASHBOARD ADSEK:");
    console.log(`📧 Email    : ${targetEmail}`);
    console.log(`🔑 Password : ${targetPassword}`);
    console.log("───────────────────────────────────────────────\n");
  } catch (err) {
    console.error("❌ Terjadi kesalahan:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
