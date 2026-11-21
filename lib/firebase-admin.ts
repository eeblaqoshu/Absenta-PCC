// lib/firebase-admin.ts
// Inisialisasi Firebase Admin SDK (hanya dijalankan di server runtime Node)
import { getApps, initializeApp, cert, getApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | undefined;
let adminAuth: Auth | null = null;

try {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.trim();
      // Bersihkan tanda kutip pembungkus jika ada
      if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))
      ) {
        privateKey = privateKey.slice(1, -1);
      }
      // Tangani escape sequence \n
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      adminAuth = getAuth(adminApp);
    } else {
      console.warn("Kredensial Firebase Admin SDK di .env belum lengkap.");
    }
  } else {
    adminApp = getApp();
    adminAuth = getAuth(adminApp);
  }
} catch (error) {
  console.error("Gagal menginisialisasi Firebase Admin SDK:", error);
  adminAuth = null;
}

export { adminApp, adminAuth };
