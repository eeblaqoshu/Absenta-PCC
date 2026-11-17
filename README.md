# Sistem Presensi Pengurus Organisasi (PCC Polines)

Sistem presensi berbasis web untuk STO (Struktur Tim Organisasi) dan Panitia Kegiatan Politeknik Negeri Semarang. Dilengkapi autentikasi terintegrasi Firebase (Google Auth & Email/Password), QR code dinamis berbasis HMAC, validasi radius geolocation, manajemen izin, serta kalkulasi poin kehadiran otomatis.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Database & ORM**: MySQL & [Prisma ORM](https://www.prisma.io/)
- **Autentikasi**:
  - STO: Firebase Auth Google Provider
  - Adsek (Admin / Sekretaris): Firebase Auth Email & Password
  - Server-side Session: Firebase Admin SDK (HttpOnly Cookie)
- **Fitur Khusus**:
  - Dynamic HMAC QR Code (`qrcode.react` & `@yudiel/react-qr-scanner`)
  - Geolocation & Peta Radius (`leaflet`)
  - Validasi Input & Skema (`zod`)
  - Dialog Interaktif (`sweetalert2`)

---

## 📁 Struktur Direktori

```text
├── app/                      # Next.js App Router (Halaman & API Routes)
│   ├── (auth)/login/         # Halaman login STO & Adsek
│   ├── (sto)/                # Rute khusus pengurus STO (/home, /scan, /izin)
│   ├── (adsek)/dashboard/    # Rute khusus dashboard Adsek (/proker, /sto, /lokasi, /izin, dll.)
│   └── api/                  # API Endpoint (auth & presensi)
├── components/               # Komponen UI Reusable
│   ├── dashboard/            # Komponen tampilan dashboard Adsek
│   ├── ui/                   # Komponen primitif umum (modal, dll.)
│   └── ...                   # Komponen scan presensi, peta Leaflet, tabs
├── lib/                      # Logika bisnis & utility server/klien
│   ├── actions/              # Server Actions Next.js (agenda, sesi, izin, presensi, proker, sto)
│   ├── akses.ts              # Single source of truth hak akses agenda (target_peserta)
│   ├── auth.ts               # Autentikasi sesi & verifikasi cookie
│   ├── geo.ts                # Perhitungan jarak GPS (Haversine)
│   ├── kehadiran.ts          # Rekap kehadiran per sesi presensi
│   ├── poin.ts & rekap-poin.ts # Perhitungan poin kehadiran & leaderboard
│   ├── qr-token.ts           # Token dinamis HMAC QR code
│   └── waktu.ts              # Manipulasi & validasi waktu zona Asia/Jakarta (WIB)
├── prisma/                   # Skema Prisma ORM & migrasi database MySQL
│   ├── schema.prisma
│   └── seed.ts               # Seeder data simulasi periode, proker, agenda, dan STO
├── public/                   # Asset publik statis (logo, favicon)
├── scripts/                  # Skrip utilitas CLI (misal: inisialisasi akun adsek)
└── test/                     # Unit test otomatis logika bisnis (geo, qr, waktu, akses, poin)
```

---

## 🚀 Memulai Proyek

### 1. Prasyarat
- Node.js versi 20 ke atas
- MySQL database server berjalan

### 2. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env` dan lengkapi konfigurasi:
```bash
cp .env.example .env
```
Isi variabel:
- `DATABASE_URL`: URL koneksi MySQL (contoh: `mysql://root:password@127.0.0.1:3306/presensi_sto`)
- `NEXT_PUBLIC_FIREBASE_*`: Kredensial Firebase SDK untuk sisi klien
- `FIREBASE_*`: Kredensial Firebase Service Account untuk sisi server

### 3. Instalasi Dependensi & Setup Database
```bash
# Instal modul
npm install

# Generate Prisma Client & jalankan migrasi
npm run db:generate
npm run db:migrate

# (Opsional) Isi data simulasi / dummy
npm run db:seed
```

### 4. Membuat Akun Admin / Adsek Pertama
Gunakan skrip CLI bawaan untuk membuat atau menyetel ulang kredensial adsek di Firebase & database:
```bash
npm run create-adsek -- admin@pcc.polines.ac.id password123
```

---

## 📜 Daftar Perintah (NPM Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server development Next.js |
| `npm run build` | Melakukan build produksi Next.js |
| `npm run start` | Menjalankan server Next.js mode produksi |
| `npm run lint` | Memeriksa format dan aturan kode dengan ESLint |
| `npm run typecheck` | Validasi tipe data TypeScript tanpa menghasilkan output build |
| `npm test` | Menjalankan seluruh rangkaian automated unit test |
| `npm run db:generate` | Memperbarui Prisma Client sesuai schema terbaru |
| `npm run db:migrate` | Menjalankan migrasi database ke MySQL |
| `npm run db:seed` | Menjalankan seeder database |
| `npm run create-adsek` | Membuat/mereset akun Adsek ke Firebase & database |

---

## 🔒 Aturan Bisnis & Keamanan Utama

1. **Server-Side Validation**: Seluruh keputusan presensi, perhitungan jarak, hak akses, dan status kehadiran divalidasi ketat di sisi server (klien hanya mengirim token QR dan koordinat GPS).
2. **Dynamic HMAC QR**: Token QR sesi dibuat dengan HMAC SHA-256 dan berganti berkala (jendela waktu 14 menit / 840 detik) guna mencegah kecurangan berbagi tangkapan layar (screenshot).
3. **Radius & Verifikasi**: Jarak dihitung menggunakan formula Haversine. Presensi di luar radius tetap disimpan namun memerlukan persetujuan manual oleh Adsek.
4. **Target Peserta Terpusat**: Hak akses agenda (`semua_panitia_sto`, `semua_panitia`, `hanya_pj_pi`) dipusatkan di `lib/akses.ts`.
