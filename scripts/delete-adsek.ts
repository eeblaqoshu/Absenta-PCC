// scripts/delete-adsek.ts
// Skrip untuk menghapus akun Adsek dari database MySQL dan Firebase Authentication
import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { PrismaClient } from "@prisma/client";

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

const app =
  getApps().length === 0 && projectId && clientEmail && privateKey
    ? initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      })
    : getApps()[0];

const auth = app ? getAuth(app) : null;
const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();

  if (!targetEmail) {
    console.error("\n Masukkan email akun adsek yang ingin dihapus!");
    console.error("   Contoh: npx tsx scripts/delete-adsek.ts admin@pcc.polines.ac.id\n");
    process.exit(1);
  }

  console.log(`\nMemulai penghapusan akun Adsek: ${targetEmail}`);

  try {
    // 1. Hapus dari Firebase Auth jika terdaftar
    if (auth) {
      try {
        const user = await auth.getUserByEmail(targetEmail);
        await auth.deleteUser(user.uid);
        console.log(`✅ User berhasil dihapus dari Firebase Auth (UID: ${user.uid})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("user-not-found") || msg.includes("auth/user-not-found")) {
          console.log(`ℹ️  User tidak ditemukan di Firebase Auth (sudah bersih).`);
        } else {
          console.warn(`⚠️  Gagal menghapus dari Firebase: ${msg}`);
        }
      }
    }

    // 2. Hapus dari database MySQL
    const deleteResult = await prisma.akunAdsek.deleteMany({
      where: { email: targetEmail },
    });

    if (deleteResult.count > 0) {
      console.log(`✅ Berhasil menghapus ${deleteResult.count} data akun dari database MySQL.\n`);
    } else {
      console.log(`ℹ️  Akun tidak ditemukan di database MySQL (sudah bersih).\n`);
    }

    console.log(`🎉 Akun "${targetEmail}" telah bersih sepenuhnya.`);
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat menghapus akun:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
