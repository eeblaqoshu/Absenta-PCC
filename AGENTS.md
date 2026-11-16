# AGENTS.md: Panduan untuk AI Agent

Panduan ini wajib dibaca sebelum menulis kode di proyek **Sistem Presensi Pengurus Organisasi**. Sumber kebenaran kebutuhan ada di `PRD.md`. Jika panduan ini dan PRD bertentangan, **berhenti dan tanyakan** ke developer; jangan menebak.

## 1. Ringkasan proyek

Website presensi STO/panitia dengan login Firebase Authentication (Google untuk STO, email/password untuk adsek), scan QR dinamis, dan validasi lokasi radius 500 m. Data dikelompokkan: `periode → proker → agenda → sesi_presensi → presensi`.

## 2. Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- MySQL 8.4 + Prisma ORM (Laragon, `127.0.0.1:3306`, database `presensi_sto`)
- Firebase Authentication: provider Google (STO) + Email/Password (adsek). Klien memakai Firebase JS SDK, server memakai **Firebase Admin SDK** (session cookie httpOnly). Auth.js tidak dipakai.
- `qrcode.react` (menampilkan QR), `@yudiel/react-qr-scanner` (scan)
- `leaflet` (peta pemilih lokasi & peta radius di halaman scan; pakai plain leaflet, dimuat dinamis di Client Component)
- Validasi input: Zod

## 3. Istilah dan nama (jangan diubah)

| Istilah | Arti |
|---|---|
| adsek | admin + sekretaris umum + sekretaris inti |
| STO | pengurus terdaftar (tabel `STO`) |
| proker | program kerja (tabel `proker`), pengganti kata "kegiatan" |
| lokasi | master titik presensi (tabel `lokasi`): nama, lat, lng, radius_m |
| PI | peran `ketua`, `sekretaris`, `bendahara` |
| PJ | peran `pj_divisi` |

Nama tabel/enum/kolom mengikuti PRD persis (akun adsek memakai `email` dan `firebase_uid`, tanpa `username`/`password_hash`): `akun_adsek`, `STO`, `lokasi`, `proker`, `kepanitiaan`, `agenda`, `sesi_presensi`, `presensi`. Kolom relasi: `proker_id`, `sto_id`, `agenda_id`, `sesi_id`, `lokasi_id`. Jangan memakai nama lama (`kegiatan`, `users_pengurus`, `akun_staf`, `pengurus_id`).

Di Prisma, pakai nama model PascalCase (`Sto`, `Proker`, ...) dengan `@@map` ke nama tabel di atas bila perlu.

## 4. Aturan bisnis yang tidak boleh dilanggar

1. **Semua validasi presensi di server.** Klien hanya mengirim token QR dan koordinat. Jangan percaya `sto_id`, waktu, atau jarak dari klien.
2. `sto_id` diambil dari **sesi login server**, bukan dari body request.
3. Validasi scan (urutan wajib, semuanya harus lolos):
   1. Email sesi terdaftar di `STO` periode aktif
   2. Token QR valid (HMAC, jendela saat ini atau sebelumnya)
   3. Waktu server dalam `buka_at`–`tutup_at`
   4. Jarak Haversine **dihitung dan disimpan** (`jarak_m`). Di luar `radius_m` tidak menolak: tandai `di_luar_radius = true` + `status_verifikasi = menunggu` untuk ditinjau adsek (lihat aturan 17)
   5. `bolehAkses(stoId, agendaId)` bernilai true
   6. Belum absen (`UNIQUE(sesi_id, sto_id)`; tangani error unik dengan pesan ramah)
4. Aturan akses agenda (`target_peserta`) hanya diimplementasi di **satu fungsi**: `lib/akses.ts → bolehAkses`. Dipakai oleh query home dan API scan. Jangan menduplikasi logikanya.
   - `semua_panitia_sto`: semua STO di periode proker
   - `semua_panitia`: ada di `kepanitiaan` proker tsb
   - `hanya_pj_pi`: ada di `kepanitiaan` dan `peran <> 'anggota'`
5. Peran dibaca dari `kepanitiaan` setiap kali dicek (pasangan `proker_id + sto_id`). Jangan menyalin peran ke tabel lain.
6. **Periode `selesai` read-only.** Setiap mutasi (proker, kepanitiaan, agenda, sesi, presensi) harus menolak jika periodenya bukan `aktif`.
7. Hanya satu periode `aktif` pada satu waktu.
8. Sesi punya `buka_at` + `tutup_at` (tanpa `durasi_menit`). `buka_at` dibentuk dari **tanggal sesi** + **jam mulai** (WIB) yang diisi adsek; `tutup_at` = tanggal sesi + **jam maksimum kedatangan** (WIB). Perubahan jam maksimum menghitung ulang `tutup_at`. Tanggal sesi wajib berada di dalam rentang agenda (`tgl_pelaksanaan`–`tgl_selesai`). `buka_at` terkunci bila sesi sudah punya presensi.
9. Status presensi: `hadir` jika scan ≤ 15 menit sejak `buka_at`, selain itu `terlambat`. `menit_terlambat` dihitung dari `buka_at` + `waktu_scan` (helper `lib/waktu.ts`), disimpan, dan boleh dikoreksi adsek; status diturunkan dari `menit_terlambat` (`statusDariMenitTerlambat`). Simpan batas sebagai konstanta di `lib/konstanta.ts`, bukan angka sembarang di kode.
10. Status home (akan datang / sedang berlangsung / selesai) **dihitung**, tidak disimpan di database.
11. QR **dinamis**: token = HMAC(`qr_secret`, `sesi_id` + jendela waktu 14 menit = 840 detik, konstanta `QR_WINDOW_SECONDS`). Payload QR yang dipindai berformat `PRESENSI:<sesi_id>:<token>` (`lib/qr-token.ts`). `qr_secret` tidak pernah dikirim ke klien.
12. Titik presensi melekat pada **agenda**: `agenda.lokasi_id` (opsional, asal master `lokasi`) + snapshot `lat`/`lng`/`radius_m`. Master `lokasi` hanya sumber awal titik; validasi scan memakai nilai di agenda, bukan nilai master yang bisa berubah. Agenda punya rentang tanggal (`tgl_pelaksanaan`, `tgl_selesai` opsional, multi-hari).
13. Endpoint scan dibatasi laju (lihat `lib/rate-limit.ts`) dan seluruh penolakan memakai bentuk `{ error: { kode, pesan } }`.
14. Izin melekat pada **sesi** (satu izin per pasangan `sesi_id + sto_id`, UNIQUE), diajukan STO, ditinjau adsek. Setiap izin punya `jenis` (`terlambat`/`sakit`/`izin`/`lainnya`) + alasan teks. STO melihat semua sesi haknya yang belum ditutup. Sesi yang sudah ditutup menolak pengajuan (`SESI_SUDAH_DITUTUP`). Hanya status `disetujui` yang mengubah poin.
15. Poin kehadiran hanya dihitung di `lib/poin.ts` (bobot) dan `lib/rekap-poin.ts` (rekap). Jangan menulis ulang rumusnya di komponen. Poin dihitung per **sesi yang sudah ditutup**.
16. Aturan `target_peserta` tetap hanya di `lib/akses.ts`: fungsi murni `putuskanAkses` (dipakai `bolehAkses`, `lib/peserta.ts`, dan rekap poin). Jangan menduplikasi percabangannya.
17. Satu agenda boleh punya **banyak** sesi presensi; tidak ada lagi `UNIQUE(agenda_id)`. Radius bersifat informasi: presensi di luar radius disimpan dengan `status_verifikasi = menunggu` dan hanya adsek yang boleh menerima/menolak (`lib/actions/presensi.ts`). Presensi berstatus `ditolak` tidak dihapus, tetapi tidak dihitung sebagai kehadiran di rekap poin.
18. Kelola kehadiran adsek (`lib/kehadiran.ts` + `components/dashboard/daftar-kehadiran.tsx`): rekap peserta per **sesi** (`rekapKehadiranSesi`) memakai `lib/peserta.ts`; absensi manual (`catatPresensiManualAction`, kolom `manual`) dan koreksi `menit_terlambat` ada di `lib/actions/presensi.ts`. QR disembunyikan saat sesi belum dibuka/sudah ditutup; status kehadiran & CSV tetap tersedia.
19. Kartu agenda adsek (`components/dashboard/proker-detail.tsx`) meniru tampilan dashboard STO (tab Akan Datang/Sedang Berlangsung/Selesai) memakai `hitungStatusAgenda(tglMulai, waktuMulai, tglSelesai, now)` (`lib/waktu.ts`). Titik presensi (peta + pilih master `lokasi` + radius) diatur di modal agenda, bukan di modal sesi. Sesi dibuat/diubah lewat modal `components/dashboard/sesi-modal.tsx` (tanggal + jam mulai + jam maksimum kedatangan); daftar hadir dibuka lewat modal `components/dashboard/kehadiran-modal.tsx` — jangan menempelkan form/daftar ke kartu. Agenda `akan_datang` tanpa sesi tidak menampilkan aksi apa pun (tanpa badge "Belum Dibuka", tanpa Tambah Sesi/Daftar Hadir); tombol Tambah Sesi baru muncul saat status `sedang_berlangsung`. Agenda yang sudah lewat (`agendaTelahBerlalu`) ditolak `buatSesiAction` (`AGENDA_SELESAI`) dan hanya boleh menampilkan daftar hadir. Kolom `waktu_pelaksanaan` (`TIME`) dibaca apa adanya sebagai jam WIB (`jamDariWaktuAgenda`) — jangan dikonversi zona lagi.

## 5. Struktur folder

```
app/
  (auth)/login/
  (sto)/home, profil, scan, izin
  (adsek)/dashboard/ (periode, sto, leaderboard, lokasi, proker, izin, presensi/[sesi], rekap)
  api/
    presensi/scan/route.ts
    presensi/qr-token/route.ts
    presensi/hadir/route.ts
    presensi/export/route.ts   ekspor CSV daftar kehadiran (adsek)
lib/
  firebase-client.ts  inisialisasi Firebase JS SDK (klien)
  firebase-admin.ts   inisialisasi Admin SDK (server saja)
  auth.ts             verifikasi session cookie, ambil pengguna (adsek/STO) dari database
  prisma.ts        singleton Prisma client
  akses.ts         aturan target_peserta (putuskanAkses + bolehAkses)
  peserta.ts       daftar peserta sah sebuah agenda (putuskanAkses) untuk kelola kehadiran
  kehadiran.ts     rekap kehadiran per SESI (status absen, izin, poin)
  poin.ts          bobot & kategori poin kehadiran
  rekap-poin.ts    rekap poin / leaderboard periode aktif
  geo.ts           haversine
  qr-token.ts      buat/verifikasi token HMAC + parse payload QR
  waktu.ts         helper zona Asia/Jakarta, gabung tanggal+jam WIB, menit keterlambatan
  konstanta.ts     batas terlambat, radius default, durasi jendela QR
  rate-limit.ts    pembatas laju in-memory untuk endpoint scan
  actions/         server actions (periode, sto, proker, agenda, lokasi, sesi, izin, presensi)
prisma/
  schema.prisma
  seed.ts          data simulasi sesuai PRD
components/
  peta-pilih-lokasi.tsx   pemilih titik + radius (Leaflet, klien)
  scan-presensi.tsx       kamera QR + peta radius (halaman STO)
  dashboard/              komponen UI dashboard
    sesi-modal.tsx            modal popup buat/ubah/tutup/hapus sesi (tanggal dalam rentang agenda + jam mulai + jam maks kedatangan)
    daftar-kehadiran.tsx      tabel kelola kehadiran + absensi manual/koreksi menit + CSV
    kehadiran-modal.tsx       modal popup daftar hadir STO pada kartu agenda
    layar-qr.tsx              QR dinamis (hanya saat berjalan) + daftar hadir langsung
```

Letakkan logika bisnis di `lib/` atau server actions/route handlers, bukan di komponen UI.

## 6. Konvensi kode

- TypeScript `strict`. Hindari `any`.
- Validasi semua input API/form dengan Zod; kembalikan error terstruktur `{ error: { kode, pesan } }`.
- Pesan error untuk pengguna dalam **Bahasa Indonesia**, singkat dan jelas (contoh: "Anda berada di luar radius presensi").
- Nama variabel/fungsi dalam bahasa Inggris atau Indonesia yang konsisten dengan istilah di bagian 3; jangan campur sinonim.
- Komponen: Server Component secara default; gunakan Client Component hanya untuk kamera, GPS, dan interaktivitas.
- Tailwind: mobile-first (`sm:`, `md:` untuk layar lebih besar). Jangan menambah library UI berat tanpa persetujuan.
- Waktu: simpan `DATETIME(6)` UTC (MySQL tidak punya `timestamptz`), tampilkan Asia/Jakarta. Semua perbandingan waktu dilakukan di server dengan jam server.
- Tanggal dan jam agenda: `tgl_pelaksanaan` (`DATE`) dan `waktu_pelaksanaan` (`TIME`); gabungkan lewat helper di `lib/waktu.ts`.

## 7. Keamanan

- Password dikelola Firebase; **jangan menyimpan atau mencatat password** di database/log. Jangan mencatat `qr_secret` ke log.
- Verifikasi ID token/session cookie **hanya di server** (Admin SDK `verifyIdToken` / `verifySessionCookie` dengan pengecekan revoked). Jangan mempercayai email atau uid dari klien.
- Setelah token valid, selalu cocokkan email ke `akun_adsek` lalu `STO` periode aktif. Tidak ada di keduanya = tolak, jangan buat sesi.
- Firebase Admin SDK tidak jalan di Edge runtime: middleware hanya mengecek keberadaan cookie sesi; verifikasi penuh dilakukan di route handler dan server component (runtime Node).
- Kunci service account adalah rahasia server: jangan di kode klien, jangan di-commit, jangan memakai prefix `NEXT_PUBLIC_`.
- Lindungi route dengan middleware berbasis role: `/dashboard/*` hanya adsek, `/home|/scan|/profil` hanya STO. Hak `admin`-only: periode, STO, akun adsek.
- Jangan percaya data dari klien (koordinat hanya masukan untuk dihitung server; tetap batasi rate pada endpoint scan).
- Simpan rahasia di `.env`; jangan commit. Sediakan `.env.example`.
- Kamera dan GPS hanya jalan di HTTPS (localhost dikecualikan saat pengembangan).

## 6b. Variabel lingkungan

```
DATABASE_URL=
# Klien (publik, aman terlihat di browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# Server (RAHASIA)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 8. Cara kerja yang diharapkan

1. Kerjakan **satu tahap** pada satu waktu sesuai urutan di PRD bagian 10. Jangan melompat ke fitur tahap berikutnya.
2. Sebelum mengubah skema database: baca `prisma/schema.prisma`, buat migrasi (`npx prisma migrate dev --name <deskripsi>`), perbarui `seed.ts`. Jangan mengedit migrasi lama yang sudah diterapkan.
3. Jangan mengubah nama tabel/kolom/enum di PRD tanpa persetujuan developer.
4. Jika ada aturan bisnis yang ambigu, daftar di "Pertanyaan terbuka" PRD lalu tanyakan; jangan memutuskan sendiri.
5. Tambahkan tes untuk logika penting: `bolehAkses`, `haversine`, verifikasi token QR, penentuan status `hadir/terlambat`, dan API scan (semua jalur penolakan).
6. Perubahan kecil dan terfokus per commit; pesan commit jelas.

## 9. Perintah umum

```bash
npm install
npx prisma migrate dev        # migrasi lokal
npx prisma db seed            # isi data simulasi
npm run dev                   # jalankan lokal
npm run lint && npm run build # cek sebelum selesai
npm test                      # jalankan tes
```

## 10. Definition of Done (per tugas)

- [ ] Sesuai PRD dan aturan bisnis di bagian 4.
- [ ] Validasi server untuk semua input; tidak ada logika keamanan hanya di klien.
- [ ] Tipe TypeScript bersih, `npm run lint` dan `npm run build` lolos.
- [ ] Tes relevan ditambahkan dan lulus.
- [ ] Tampilan diperiksa di lebar ponsel dan desktop.
- [ ] Tidak ada secret atau data pribadi di kode/log.
- [ ] Seed dan dokumentasi diperbarui bila skema berubah.

## 11. Yang tidak boleh dilakukan

- Menggunakan `localStorage` untuk keputusan keamanan atau status presensi.
- Menyimpan status kegiatan (akan datang/berlangsung/selesai) sebagai kolom.
- Membuat database terpisah per periode (keputusan: satu database dengan tabel `periode`).
- Menambah fitur di luar PRD (notifikasi, izin/sakit, aplikasi native) tanpa persetujuan.
- Menghapus data presensi secara fisik; gunakan koreksi oleh adsek yang tercatat bila diperlukan.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
