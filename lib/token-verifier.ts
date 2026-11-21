// lib/token-verifier.ts
// Verifikasi kriptografis token Firebase secara lokal (zero network dependency)
// Mencegah ETIMEDOUT / ENETUNREACH pada server hosting cPanel dengan firewall ketat.
import crypto from "node:crypto";

// Sertifikat publik resmi Google (valid s/d Mei 2027)
// Sumber: https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
export const GOOGLE_PUBLIC_CERTS: Record<string, string> = {
  "904b0f91be6eb0867dabbaab587dfc2e33f00a24":
    "-----BEGIN CERTIFICATE-----\n" +
    "MIIDHTCCAgWgAwIBAgIJAPQVm4IqLvDqMA0GCSqGSIb3DQEBBQUAMDExLzAtBgNV\n" +
    "BAMMJnNlY3VyZXRva2VuLnN5c3RlbS5nc2VydmljZWFjY291bnQuY29tMB4XDTI2\n" +
    "MDUwNDE3NDcyN1oXDTI3MDUwNDE3NDcyN1owMTEvMC0GA1UEAwwmc2VjdXJldG9r\n" +
    "ZW4uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20wggEiMA0GCSqGSIb3DQEBAQUA\n" +
    "A4IBDwAwggEKAoIBAQDbarTg+wH+qOjVtOp2l9eZ/dQ44/QYWK9jw1NfcHxxMzWB\n" +
    "XEcvhuknDbQuuXZrl8m147XNsozHdQpKFgpCUHmWAiBK0OH1BK4u23m9UJYUUgh0\n" +
    "dbWyybvrbYXmpFP3vf4kbFUss8+QmU6OipuBrBDtDQwolkzwIHCh6nCgK/iWgwGe\n" +
    "VCGtCobowe/kvWLUPn/LWd44guhtsU8J+jF07ReDW8Yqp5TSiF1xTtXchPU5njle\n" +
    "TOewIR99UKb3VbCaNa5GtmHXEndmzLl64efQQ8Hrw+xR7XVKlmw0yzN8HVYJvuW4\n" +
    "Np17eL+7wrZrNrF/CcRSqbV5LTut70JBA6cpjvDHAgMBAAGjODA2MAwGA1UdEwEB\n" +
    "/wQCMAAwDgYDVR0PAQH/BAQDAgeAMBYGA1UdJQEB/wQMMAoGCCsGAQUFBwMCMA0G\n" +
    "CSqGSIb3DQEBBQUAA4IBAQA8NOsYc/660OW3xD6OtitVuJFAMzH2s0v+NBQtTDJR\n" +
    "kCo6b5k8KcmTYlg5bAL633rHEa9a/H/IhCqPqcv/sGItxerKLFlj6L+snVO7KEPl\n" +
    "WEf/uue+VCrdnoMJVxMBaWwq+vNYKxStmfz7shCVYHMdCzJe1qaQZg30k4jzlQsZ\nsUNb/wTL8QX6x3BrtOGcIuOS9HktjH2DRAVj6rGdppsMjLlm7OSj4TgDOa6CTDFf\nhkk19L0pJisQ7CNr08Uln/REr4o2BQyivMFMtn3ILdIo7+XglfCYU+3XkiwfxHAC\nWBhhKkORTkkH0OooaINjnBhGmDEJXGFIhNuuFmm+VbQ3\n" +
    "-----END CERTIFICATE-----\n",
  "81805e76fd5fa2fd91c2bb39e4b7ef05469bddce":
    "-----BEGIN CERTIFICATE-----\n" +
    "MIIDHTCCAgWgAwIBAgIJAOBUKWdekOLLMA0GCSqGSIb3DQEBBQUAMDExLzAtBgNV\n" +
    "BAMMJnNlY3VyZXRva2VuLnN5c3RlbS5nc2VydmljZWFjY291bnQuY29tMB4XDTI2\n" +
    "MDUwNDE3NDcyN1oXDTI3MDUwNDE3NDcyN1owMTEvMC0GA1UEAwwmc2VjdXJldG9r\n" +
    "ZW4uc3lzdGVtLmdzZXJ2aWNlYWNjb3VudC5jb20wggEiMA0GCSqGSIb3DQEBAQUA\n" +
    "A4IBDwAwggEKAoIBAQDsTTVcwu+zIgditu6L+jPxmIJjxCCpC5tiArtNpHCMZjAt\nhIcaUW3QT9lbYM8MLxqsaS8bDBBxikoGpdJzasIABXxaIWwG1lGQVIs7UtOdJvQl\n1RdLX0XXf6wdxwfC4efi5wiLnTkvjHc4qA6rigwSNKsFuwNU9iVwIDdkjEWfRImj\nBwCXMwlTck9yEvT03R5mQ97+GvL8EWEH0I4jqgR5NOEvXMBEf4TRLgyaua1GWXhu\nlZ07CU5JOa4mLLbp9U6h12y4GFZ50+ed8WXWUm7pC7Uat0nXC6cN56esJDn21U3c\nDqwJVl15pup/PwLZs/+zmWofQi+wsi1UVg17S1VnAgMBAAGjODA2MAwGA1UdEwEB\n/wQCMAAwDgYDVR0PAQH/BAQDAgeAMBYGA1UdJQEB/wQMMAoGCCsGAQUFBwMCMA0G\nCSqGSIb3DQEBBQUAA4IBAQCx2J3AH3TBtGy99Rn1yqS6TNTEL4t5GSM3HCv0gm9b\nDL9OXTHWxwFLHuXHXMaAhJdF9/x8BH8F+QehEeBG7qJNpocvyOekl71SInVQGcmL\nhwDJ8YXCDUqXLYhcrSr18IOFCq4yX9lxHtISaOpTncgS9xnG9nDNpVmTJX+eAxiF\nVTAjLDmzutNIZ+IqEwA4aHYjXxie+sZSIjxDKsF+S6QL6fmGvQabX/w68ZdPtvhA\njIGMAF3D3KNWAkFMsw0rpXkWnb+auvmq17onuOH3nkWvR6ocIn8ofBVrXOA3FZ0d\n+3reNfFzsxQO5F1q/omny5cOfc4GAfYWsQ9e8YImP31c\n" +
    "-----END CERTIFICATE-----\n",
};

export interface DecodedIdTokenLocal {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  sub?: string;
  [key: string]: unknown;
}

/**
 * Memverifikasi Firebase ID token secara lokal tanpa koneksi keluar.
 * Memeriksa tanda tangan kriptografis RSA-SHA256, masa berlaku, issuer, dan audience.
 */
export function verifikasiGoogleTokenOffline(
  idToken: string,
  expectedProjectId: string
): DecodedIdTokenLocal {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Format JWT tidak valid");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(
    Buffer.from(headerB64, "base64url").toString("utf8")
  ) as { alg?: string; kid?: string };
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8")
  ) as DecodedIdTokenLocal & { exp?: number };

  if (header.alg !== "RS256") {
    throw new Error("Algoritma token bukan RS256");
  }

  const kid = header.kid;
  if (!kid) {
    throw new Error("Header token tidak memiliki Key ID (kid)");
  }

  const cert = GOOGLE_PUBLIC_CERTS[kid];
  if (!cert) {
    throw new Error(`Sertifikat Google tidak ditemukan untuk key ID: ${kid}`);
  }

  // Verifikasi tanda tangan RSA
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(signatureB64, "base64url");
  const isValid = verifier.verify(cert, signature);

  if (!isValid) {
    throw new Error("Tanda tangan kriptografis token tidak valid");
  }

  // Verifikasi kedaluwarsa
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token Google telah kedaluwarsa");
  }

  // Verifikasi Audience & Issuer jika projectId disediakan
  if (expectedProjectId) {
    if (payload.aud !== expectedProjectId) {
      throw new Error(
        `Audience token (${payload.aud}) tidak cocok dengan project (${expectedProjectId})`
      );
    }
    if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
      throw new Error(`Issuer token (${payload.iss}) tidak sesuai`);
    }
  }

  return {
    ...payload,
    uid: (payload.sub || payload.uid) as string,
  };
}

/**
 * Membuat session cookie bertanda tangan HMAC (tahan banting tanpa network keluar).
 */
export function buatSessionTokenLokal(payload: {
  email: string;
  uid: string;
  expiresInMs: number;
}): string {
  const secret =
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.SESSION_SECRET ||
    "absenta-pcc-auth-fallback-secret-2026";
  const data = {
    ...payload,
    exp: Date.now() + payload.expiresInMs,
  };
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `absenta_${body}.${sig}`;
}

/**
 * Memverifikasi session cookie bertanda tangan HMAC lokal.
 */
export function verifikasiSessionTokenLokal(
  token: string
): { email: string; uid: string } | null {
  if (!token.startsWith("absenta_")) return null;
  const raw = token.slice("absenta_".length);
  const parts = raw.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const secret =
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.SESSION_SECRET ||
    "absenta-pcc-auth-fallback-secret-2026";
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  // Periksa integritas signature
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (data.exp && data.exp < Date.now()) return null;
    if (!data.email || !data.uid) return null;

    return { email: data.email, uid: data.uid };
  } catch {
    return null;
  }
}
