// lib/firebase-client.ts
// Inisialisasi Firebase JS SDK untuk sisi browser / klien (Lazy load agar aman saat Next.js prerender)
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let clientAuth: Auth | undefined;

export function getClientAuth(): Auth {
  if (typeof window === "undefined") {
    throw new Error("getClientAuth hanya dapat dipanggil di browser.");
  }

  if (!app) {
    if (!firebaseConfig.apiKey) {
      throw new Error(
        "Kunci Firebase belum diatur di file .env (NEXT_PUBLIC_FIREBASE_API_KEY)."
      );
    }
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }

  if (!clientAuth) {
    clientAuth = getAuth(app);
  }

  return clientAuth;
}

export const googleProvider = new GoogleAuthProvider();

// Kunci dan tampilkan langsung daftar akun Google berformat @mhs.polines.ac.id
googleProvider.setCustomParameters({
  hd: "mhs.polines.ac.id",
  prompt: "select_account",
});

/**
 * Mendaftarkan akun baru di Firebase Auth langsung dari peramban (client-side)
 * menggunakan instance Firebase App terpisah tanpa mengubah status login admin saat ini.
 * Ini memastikan pembuatan akun selalu berhasil meskipun server hosting memblokir koneksi keluar ke Google.
 */
export async function daftarkanUserDariKlien(
  email: string,
  password: string,
): Promise<{ uid: string | null; error?: string }> {
  if (typeof window === "undefined") {
    return { uid: null, error: "Hanya dapat dipanggil di browser." };
  }

  const { initializeApp, deleteApp } = await import("firebase/app");
  const { getAuth, createUserWithEmailAndPassword } = await import(
    "firebase/auth"
  );

  const tempAppName = `AdsekCreator_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);

  try {
    const tempAuth = getAuth(tempApp);
    const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
    return { uid: cred.user.uid };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("auth/email-already-in-use")) {
      return { uid: null }; // Email sudah terdaftar di Firebase Auth
    }
    return { uid: null, error: msg };
  } finally {
    await deleteApp(tempApp).catch(() => {});
  }
}

/**
 * Mengirim email tautan pemulihan / reset kata sandi resmi dari Firebase ke email pengguna.
 */
export async function kirimEmailResetPassword(email: string): Promise<void> {
  const { sendPasswordResetEmail } = await import("firebase/auth");
  const auth = getClientAuth();
  await sendPasswordResetEmail(auth, email);
}
