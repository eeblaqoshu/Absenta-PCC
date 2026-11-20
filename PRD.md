# PRD: Sistem Presensi Pengurus Organisasi

Versi 1.0 | Status: Siap dikembangkan | Stack: Next.js, MySQL, Tailwind CSS

## 1. Ringkasan

Website presensi kehadiran pengurus (STO) dan panitia organisasi. Presensi dilakukan dengan login akun Google mahasiswa (melalui Firebase Authentication), memilih agenda, lalu scan QR code dalam radius lokasi tertentu. Data dikelompokkan per **periode kepengurusan**, per **proker**, dan per **agenda** (rapat PJ, rapat besar, rapat koordinasi, hari H).

## 2. Tujuan dan non-tujuan

**Tujuan**
- Mencatat kehadiran STO dan panitia secara akurat dan sulit dicurangi (QR dinamis + validasi lokasi + validasi waktu).
- Memudahkan adsek membuat proker, kepanitiaan, agenda, dan sesi presensi.
- Memberi STO/panitia halaman home berisi agenda yang relevan bagi mereka.
- Menyimpan riwayat per periode; periode lama menjadi read-only.

**Non-tujuan (v1)**
- Aplikasi mobile native.
- Notifikasi push/email/WhatsApp.
- Pengajuan izin/sakit.
- Ekspor laporan canggih (v1 cukup rekap di layar dan ekspor CSV).

## 3. Pengguna dan peran

| Peran | Siapa | Cara login | Kemampuan |
|---|---|---|---|
| `admin` | Pengelola sistem | Email + password (Firebase) | Semua fitur adsek, kelola periode, kelola data STO, kelola akun adsek |
| `sekretaris_umum` | Adsek | Email + password (Firebase) | Buat proker, kepanitiaan, agenda, sesi presensi, ubah jam maksimum kedatangan |
| `sekretaris_inti` | Adsek | Email + password (Firebase) | Sama seperti sekretaris umum |
| STO / panitia | Pengurus terdaftar | Google via Firebase (email mahasiswa) | Lihat home, profil, scan QR |

Istilah: **adsek** = admin + sekretaris umum + sekretaris inti. **STO** = pengurus terdaftar pada suatu periode.

## 4. Konsep data

```
periode ─┬─< STO
         └─< proker ─┬─< kepanitiaan >─ STO
                     └─< agenda ─< sesi_presensi ─< presensi >─ STO
                     └─< agenda ─< izin >─ STO
akun_adsek ── dibuat_oleh (proker, agenda, sesi_presensi, lokasi)
lokasi ──< agenda (lokasi_id, opsional; koordinat & radius disalin ke agenda)
```

Keputusan arsitektur: **satu database MySQL** dengan tabel `periode`. Pergantian periode = admin menutup periode aktif (status `selesai`, data menjadi read-only) lalu membuat periode baru. Tidak membuat database fisik baru per periode.

### Skema tabel

```sql
-- ENUM
status_periode:   aktif | selesai
role_adsek:       admin | sekretaris_umum | sekretaris_inti
peran_panitia:    ketua | sekretaris | bendahara | pj_divisi | anggota
jenis_agenda:     rapat_pj | rapat_besar | rapat_koordinasi | hari_h
target_peserta:   hanya_pj_pi | semua_panitia | semua_panitia_sto
status_presensi:  hadir | terlambat
status_izin:      menunggu | disetujui | ditolak
jenis_izin:       terlambat | sakit | izin | lainnya
status_verifikasi: menunggu | diterima | ditolak

periode(id, nama, tgl_mulai, tgl_selesai, status)
akun_adsek(id, nama, email UNIQUE, firebase_uid UNIQUE NULL, role)
STO(id, periode_id, nama, nim, email_google UNIQUE, firebase_uid UNIQUE NULL, jabatan, divisi, foto)
proker(id, periode_id, nama, deskripsi, dibuat_oleh)
kepanitiaan(id, proker_id, sto_id, peran, divisi_panitia, UNIQUE(proker_id, sto_id))
agenda(id, proker_id, jenis, judul, urutan, tgl_pelaksanaan DATE, tgl_selesai DATE NULL,
       waktu_pelaksanaan TIME, lokasi_nama, lokasi_id NULL, lat, lng, radius_m DEFAULT 500,
       target_peserta, dibuat_oleh)
lokasi(id, nama UNIQUE, lat, lng, radius_m DEFAULT 500, dibuat_oleh, created_at)
sesi_presensi(id, agenda_id, dibuat_oleh, buka_at, tutup_at, qr_secret)
izin(id, agenda_id, sto_id, jenis DEFAULT 'izin', alasan, status, ditinjau_oleh NULL, ditinjau_at NULL, created_at,
     UNIQUE(agenda_id, sto_id))
presensi(id, sesi_id, sto_id, waktu_scan, lat, lng, jarak_m, status,
         di_luar_radius DEFAULT false, status_verifikasi DEFAULT 'diterima',
         menit_terlambat DEFAULT 0, manual DEFAULT false,
         UNIQUE(sesi_id, sto_id))
```

## 5. Aturan bisnis

### 5.1 Periode
- Hanya satu periode berstatus `aktif` pada satu waktu.
- Periode `selesai` bersifat read-only: tidak boleh membuat/mengubah proker, kepanitiaan, agenda, sesi, maupun presensi di dalamnya.
- Data STO terikat ke periode. Email yang sama pada periode baru didaftarkan ulang (admin impor CSV dari Google Form).

### 5.2 Kelompok peran panitia
| Kelompok | Peran |
|---|---|
| PI (pimpinan inti) | `ketua`, `sekretaris`, `bendahara` |
| PJ (penanggung jawab) | `pj_divisi` |
| Bukan PJ/PI | `anggota` |

### 5.3 Target peserta agenda
| `target_peserta` | Siapa yang berhak melihat dan absen |
|---|---|
| `hanya_pj_pi` | Terdaftar di `kepanitiaan` proker tsb **dan** peran bukan `anggota` |
| `semua_panitia` | Terdaftar di `kepanitiaan` proker tsb (peran apa pun) |
| `semua_panitia_sto` | Semua STO pada periode proker tsb |

Peran selalu dibaca dari `kepanitiaan` pada saat pengecekan (per pasangan `proker_id + sto_id`), tidak disalin ke tabel lain.

### 5.4 Agenda & sesi presensi
- **Titik presensi melekat pada agenda**, bukan sesi: `agenda.lokasi_id` (opsional, penanda asal master `lokasi`) + snapshot `lat`, `lng`, `radius_m`. Validasi scan memakai nilai di agenda, sehingga mengubah master `lokasi` tidak mengubah agenda yang sudah dibuat.
- Agenda punya **rentang tanggal**: `tgl_pelaksanaan` (mulai) dan `tgl_selesai` (opsional, untuk agenda multi-hari). `waktu_pelaksanaan` = jam mulai agenda (WIB) dan dibaca apa adanya lewat `jamDariWaktuAgenda()`, bukan konversi zona.
- **Status agenda dihitung** dari rentang tanggal + jam mulai (Akan Datang / Sedang Berlangsung / Selesai), bukan disimpan dan bukan dari sesi.
- **Satu agenda boleh punya banyak sesi presensi.** Setiap sesi memilih **tanggal** (di dalam rentang agenda) + **jam mulai** + **jam maksimum kedatangan**; `buka_at` = tanggal+jam mulai, `tutup_at` = jam maksimum kedatangan (WIB). Tidak ada `durasi_menit`.
- Sesi dibuat/diubah/ditutup/hapus lewat **modal popup** pada kartu agenda; daftar hadir dibuka lewat **modal popup** (tidak ada form/daftar menempel di kartu).
- **Agenda `akan_datang` tanpa sesi** hanya menampilkan kartu informatif: tanpa badge "Belum Dibuka", tanpa tombol Buat Sesi/Daftar Hadir. Tombol **Tambah Sesi** muncul saat agenda `sedang_berlangsung`.
- **Agenda `selesai`**: tidak bisa dibuatkan sesi baru dan tidak menampilkan QR; opsi ubah/hapus agenda serta opsi ubah/tutup/hapus sesi disembunyikan. Daftar hadir sesi lama tetap bisa dibuka.
- Sesi hanya dapat dihapus sebelum agendanya selesai. Penghapusan sesi menghapus semua data presensi sesi tersebut secara permanen dalam transaksi yang sama; setelah agenda selesai, sesi dan riwayatnya terkunci.
- `buka_at` terkunci bila sesi sudah punya presensi (`SESI_SUDAH_ADA_PRESENSI`); `tutup_at` hanya dapat diubah sebelum agenda selesai.
- Daftar agenda adsek memakai tampilan yang sama dengan dashboard STO: tab status **Akan Datang / Sedang Berlangsung / Selesai** + kartu agenda. Setelah sesi ada, tiap baris sesi menampilkan **Layar QR** (hanya saat berjalan), **Daftar Hadir** (modal), dan tombol ubah sesi selama agenda belum selesai.
- Form sesi meminta **tanggal** (di dalam rentang agenda), **jam mulai** (WIB), dan **jam maksimum kedatangan** (WIB). Tersedia tombol "Sekarang" untuk mengisi jam dari waktu saat ini.
- Sebelum `buka_at` atau setelah `tutup_at`, layar sesi **tidak menampilkan QR** (presensi tidak bisa dilakukan); daftar kehadiran dan ekspor CSV tetap tersedia.

### 5.5 Status presensi
- `hadir`: scan sampai 15 menit setelah `buka_at`.
- `terlambat`: scan setelah 15 menit sampai `tutup_at`.
- `menit_terlambat` dihitung dari selisih `waktu_scan` - `buka_at` (bulat, minimal 0) dan disimpan; adsek boleh mengoreksinya. Status `hadir`/`terlambat` ditentukan dari `menit_terlambat` (ambang 15 menit, `lib/waktu.ts`).
- Tidak ada baris presensi = alpa (dihitung dari kepanitiaan/target peserta dikurangi presensi).
- Batas 15 menit adalah konstanta awal (lihat Pertanyaan Terbuka).

### 5.5a Izin (per agenda)
- Izin melekat pada **agenda**, tidak mensyaratkan sesi presensi sudah dibuat atau dibuka. Satu izin per pasangan `agenda_id + sto_id` (UNIQUE).
- STO melihat agenda yang menjadi haknya pada periode aktif (lewat `bolehAkses`) selama status agenda belum selesai, lalu dapat mengajukan izin jauh sebelum waktu agenda.
- Setiap izin punya **jenis**: `terlambat`, `sakit`, `izin`, `lainnya` (default `izin`), plus alasan teks minimal 5 karakter.
- Izin berstatus `menunggu` sampai adsek meninjau: setujui atau tolak. Peninjau dicatat pada `ditinjau_oleh` + `ditinjau_at`.
- STO dapat mengubah jenis/alasan (status kembali `menunggu`) atau membatalkan selama belum disetujui.
- Izin yang sudah disetujui tidak bisa dibatalkan STO (harus lewat adsek).
- Status izin tampil pada kartu agenda STO dan diterapkan ke seluruh sesi agenda tersebut. Pada daftar hadir per sesi, status izin menjadi status cadangan jika STO tidak memiliki presensi sah.
- Periode `selesai` = read-only: pengajuan, pembatalan, dan peninjauan izin ditolak.
- Lampiran berkas bukti izin belum ada (lihat Pertanyaan Terbuka).

### 5.5b Poin kehadiran (leaderboard)
Poin dihitung per **sesi presensi yang sudah ditutup** (`tutup_at` < sekarang), satu angka per STO per sesi:

| Kondisi | Poin |
|---|---|
| Hadir tepat waktu (scan ≤ 15 menit sejak `buka_at`) | **2** |
| Hadir terlambat, **tanpa** izin disetujui | **-2** |
| Hadir terlambat, **ada** izin disetujui | **0** |
| Tidak ada presensi (alpa), **tanpa** izin disetujui | **-2** |
| Tidak ada presensi (alpa), **ada** izin disetujui | **0** |

- Status izin `menunggu` dan `ditolak` dihitung sama seperti tidak ada izin.
- Poin 1 (hadir terlambat tanpa mempertimbangkan izin) disimpan sebagai cadangan; ubah satu baris di `lib/poin.ts` bila ketentuan berubah.
- Leaderboard lengkap ada di `/dashboard/leaderboard` (halaman terpisah); 3 teratas juga diringkas di `/dashboard`.

### 5.5c Verifikasi presensi di luar radius
- Radius **tidak lagi menggagalkan** presensi. Server menghitung jarak Haversine, menyimpannya di `presensi.jarak_m`, dan menandai `di_luar_radius`.
- Presensi di dalam radius: `di_luar_radius = false`, `status_verifikasi = diterima`.
- Presensi di luar radius: `di_luar_radius = true`, `status_verifikasi = menunggu`; adsek meninjau di layar sesi (terima/tolak).
- Presensi yang **ditolak** tidak dihapus, tetapi tidak dihitung sebagai kehadiran pada rekap poin (diperlakukan seperti alpa).
- STO menerima popup hasil presensi; bila di luar radius, popup menjelaskan bahwa presensi menunggu verifikasi adsek.

### 5.5d Kelola kehadiran oleh adsek
- Halaman sesi adsek (`/dashboard/presensi/[sesi]`) menampilkan **tabel kelola kehadiran** seluruh peserta sah agenda (diturunkan dari `target_peserta` via `lib/peserta.ts`), satu baris per STO dengan status otomatis: hadir, terlambat (menit), izin (disetujui/menunggu), alpa, atau ditolak.
- Adsek dapat **mencatat kehadiran manual** (absensi manual) untuk peserta yang belum punya presensi; baris ditandai `manual = true`.
- Adsek dapat **mengatur menit keterlambatan** setiap presensi; status `hadir`/`terlambat` dan poin ikut dihitung ulang.
- Adsek dapat **memverifikasi** presensi di luar radius dan meninjau izin dari tabel ini; izin berasal dari agenda dan berlaku di semua sesi agenda.
- Tabel dapat **diekspor ke CSV** (`/api/presensi/export?sesiId=...`, hanya adsek).

### 5.6 Validasi scan (semua dilakukan di server)
Presensi disimpan hanya jika **semua** syarat terpenuhi:
1. Sesi login valid (ID token/session cookie Firebase diverifikasi server) dan emailnya terdaftar di tabel `STO` periode aktif.
2. Token QR valid dan belum kedaluwarsa.
3. Waktu server berada di antara `buka_at` dan `tutup_at`.
4. Jarak (Haversine) dihitung dan disimpan; di luar `radius_m` tetap diterima dengan status verifikasi `menunggu` (lihat 5.5c).
5. STO berhak atas agenda tersebut (aturan 5.3).
6. STO belum pernah absen di sesi tersebut (`UNIQUE(sesi_id, sto_id)`).

Setiap penolakan mengembalikan alasan yang jelas ke pengguna (di luar waktu, tidak berhak, sudah absen, QR kedaluwarsa).

### 5.7 QR code
- QR **dinamis**: berisi token HMAC dari `sesi_id` + jendela waktu (berganti tiap 14 menit) menggunakan `qr_secret` sesi.
- Layar adsek menampilkan QR yang diperbarui otomatis, dan dapat mengunduh QR sebagai PNG.
- STO dapat memindai lewat kamera atau mengunggah gambar QR dari galeri (didekode di klien dengan `jsqr`; validasi tetap di server, tetap terikat jendela token).
- Server menerima token pada jendela saat ini dan satu jendela sebelumnya (toleransi jam/jaringan).
## 6. Fitur dan alur

### 6.1 Login
Autentikasi memakai **Firebase Authentication**; otorisasi (siapa boleh apa) tetap diputuskan database lewat tabel `akun_adsek`, `STO`, `kepanitiaan`, dan `bolehAkses`.

Alur: klien login via Firebase dan mendapat ID token → dikirim ke API → server memverifikasi token dengan Firebase Admin SDK → server mencocokkan email ke database → jika cocok, server membuat **session cookie** httpOnly. Jika email tidak terdaftar, sesi tidak dibuat dan login ditolak dengan pesan jelas.

- **STO**: tombol "Masuk dengan Google" (provider Google di Firebase). Email dicek ke `STO` periode aktif.
- **Adsek**: form email + password (provider Email/Password di Firebase). Email dicek ke `akun_adsek`. Jika sebuah email ada di `akun_adsek` dan `STO`, `akun_adsek` diprioritaskan.
- **Pembuatan akun adsek**: dilakukan admin dari dashboard. Server membuat pengguna Firebase lewat Admin SDK, menyimpan `firebase_uid`, lalu mengirim tautan atur password ke email adsek. Aplikasi tidak pernah menyimpan atau melihat password.
- Kolom `firebase_uid` diisi saat akun dibuat (adsek) atau saat login pertama (STO), lalu dipakai sebagai penghubung tetap.
- Setelah login, STO diarahkan ke home; adsek ke dashboard.

### 6.2 Home STO/panitia
- Tiga tab: **Akan Datang**, **Sedang Berlangsung**, **Selesai**.
- Daftar agenda hanya yang lolos aturan 5.3 untuk STO tersebut.
- Status dihitung dari rentang `tgl_pelaksanaan`–`tgl_selesai` + `waktu_pelaksanaan` dan waktu sekarang (zona Asia/Jakarta).
- Kartu profil: nama, NIM, email, jabatan, divisi, foto.
- Jika belum ada agenda: tampilan kosong "Belum ada kegiatan".

### 6.3 Scan presensi (STO)
1. Buka halaman scan, pilih sesi/agenda yang sedang dibuka dan menjadi haknya.
2. Izinkan kamera dan GPS (atau unggah gambar QR dari galeri).
3. Scan QR di layar adsek. Setelah berhasil muncul popup "Presensi Berhasil" berisi status,
   jarak, dan waktu; scanner ditutup. Bila sudah presensi, halaman menampilkan status
   "sudah presensi" (bukan scanner lagi) untuk sesi tersebut.
4. Presensi di luar radius tetap tercatat dan menunggu verifikasi adsek.

### 6.4 Dashboard adsek
- **Periode** (admin): buat, tutup periode.
- **STO** (admin): CRUD dan impor CSV.
- **Lokasi** (admin): CRUD master titik presensi (nama, `lat`, `lng`, `radius_m`) yang bisa dipakai ulang saat mengatur titik agenda.
- **Proker**: CRUD (dalam periode aktif).
- **Kepanitiaan**: tambah/ubah/hapus STO per proker beserta peran.
- **Agenda**: CRUD per proker; isi jenis, rentang tanggal (`tgl_pelaksanaan`–`tgl_selesai`), jam mulai, lokasi + titik presensi (pilih master `lokasi` atau pin manual di peta) + radius, serta target peserta.
- **Sesi presensi**: satu agenda boleh punya **banyak sesi**; buat sesi lewat modal (tanggal dalam rentang agenda + jam mulai + jam maksimum kedatangan), tampilkan QR dinamis, unduh QR (PNG), ubah jam maksimum kedatangan, tutup lebih awal; QR disembunyikan setelah sesi tutup.
- **Verifikasi radius**: tinjau presensi di luar radius (terima/tolak) di layar sesi / tabel kehadiran.
- **Izin**: STO memilih jenis izin (`terlambat`/`sakit`/`izin`/`lainnya`) untuk agenda yang menjadi haknya sebelum agenda selesai, meski sesi belum dibuat; adsek meninjau per agenda.
- **Kelola kehadiran**: tabel per sesi dengan status otomatis, absensi manual, koreksi menit keterlambatan, verifikasi radius, dan tinjau izin.
- **Leaderboard**: `/dashboard/leaderboard` + Top 3 di ringkasan.
- **Rekap**: kehadiran per sesi, per agenda, per proker, per STO; ekspor CSV (`/api/presensi/export?sesiId=...`).

## 7. Halaman dan rute

```
/login                      Pilih: login Google (STO) / login adsek
/home                       Home STO (3 tab + profil)
/profil                     Profil STO
/scan                       Pilih agenda + scanner QR (+ unggah gambar QR)
/izin                       Lihat agenda hak saya yang belum selesai + ajukan izin (jenis + alasan)
/dashboard                  Ringkasan adsek (termasuk Top 3 poin)
/dashboard/periode          Kelola periode (admin)
/dashboard/sto              Kelola STO (admin)
/dashboard/leaderboard      Leaderboard poin kehadiran (adsek)
/dashboard/lokasi           Kelola master lokasi presensi (admin)
/dashboard/izin             Tinjau izin STO per agenda (adsek)
/dashboard/proker           Daftar dan form proker
/dashboard/proker/[id]      Detail proker: kepanitiaan + agenda (tab status + modal sesi)
/dashboard/presensi/[sesi]  Layar QR (hanya saat berjalan) + tabel kelola kehadiran + ekspor CSV
/dashboard/rekap            Rekap dan ekspor
```

## 8. Kebutuhan non-fungsional

- **Keamanan**: semua validasi presensi di server; route adsek dilindungi role; password dikelola Firebase dan tidak disimpan di database; secret QR tidak pernah dikirim ke klien.
- **HTTPS wajib** di produksi (kamera dan geolokasi tidak berfungsi di HTTP).
- **Zona waktu**: simpan timestamp UTC (`DATETIME(6)`, MySQL tidak punya `timestamptz`), tampilkan Asia/Jakarta (WIB).
- **Responsif**: mobile-first (STO memakai ponsel), dashboard adsek nyaman di desktop.
- **Performa**: scan diproses < 2 detik pada kondisi normal; indeks pada `presensi(sesi_id)`, `kepanitiaan(proker_id, sto_id)`, `agenda(proker_id, tgl_pelaksanaan)`.
- **Audit ringan**: simpan `dibuat_oleh` dan timestamp pembuatan pada tabel utama.

## 9. Kriteria penerimaan (contoh yang harus lulus)

1. STO dengan email tidak terdaftar tidak bisa login.
2. Anggota biasa tidak melihat agenda `hanya_pj_pi` di home dan tidak bisa absen via API langsung.
3. Scan dari luar radius 500 m tetap tercatat (status verifikasi `menunggu`) dan bisa diterima/ditolak adsek; presensi yang ditolak tidak dihitung pada poin.
4. Scan setelah `tutup_at` ditolak; scan kedua pada sesi yang sama ditolak.
5. Mengubah jam maksimum kedatangan sesi memperbarui `tutup_at`.
6. Screenshot QR lama (lewat jendela token) ditolak.
7. Periode `selesai` tidak bisa diubah.
8. STO yang bukan panitia proker tetap melihat agenda `semua_panitia_sto`.
9. Izin yang disetujui membuat poin semua sesi dalam agenda itu 0; tanpa izin, alpa atau terlambat bernilai -2; tepat waktu bernilai 2.
10. QR yang berganti tiap 14 menit: token dari jendela lebih lama dari satu jendela sebelumnya ditolak.
11. Izin diajukan per agenda sebelum agenda selesai (meski belum ada sesi) dan punya jenis (`terlambat`/`sakit`/`izin`/`lainnya`); status tampil di kartu agenda STO dan semua tabel kehadiran sesinya.
12. Adsek bisa mencatat kehadiran manual dan mengubah menit keterlambatan; status `hadir`/`terlambat` dan poin ikut berubah sesuai ambang 15 menit.
13. Setelah `tutup_at`, QR tidak ditampilkan lagi, tetapi tabel kehadiran dan ekspor CSV tetap bisa diakses adsek.
14. Satu agenda boleh memiliki beberapa sesi; sesi di luar rentang tanggal agenda ditolak (`TANGGAL_DI_LUAR_RENTANG`).
15. Radius presensi dihitung dari titik pada agenda (`agenda.lat`/`lng`/`radius_m`), bukan dari sesi.

## 10. Tahapan pengembangan

1. **Fondasi**: setup proyek, `schema.prisma`, migrasi, seed data simulasi.
2. **Autentikasi**: Firebase Auth (Google untuk STO, email/password untuk adsek), session cookie server, proteksi route per role.
3. **Master data**: periode, STO (impor CSV), proker, kepanitiaan, agenda.
4. **Presensi inti**: sesi, QR dinamis, API scan dengan 6 validasi, `bolehAkses`.
5. **Home dan profil STO**: tiga tab status.
6. **Rekap dan ekspor CSV**.
7. **Pengujian dan deploy** (HTTPS).

## 11. Pembagian Pengerjaan Tim

### Bagian Albi
- **Modul A: Database & Autentikasi (On Progress)**
  1. Skema & Database (Prisma, migrasi, seed data)
  2. Integrasi Firebase Authentication (Google Auth STO, Email/Password Adsek, Session Cookie via Admin SDK)
  3. Middleware & Proteksi Role (`/dashboard/*` untuk adsek, `/home|scan|profil` untuk STO)
  4. Halaman Login (`/login`)
- **Modul B: Master Data & Manajemen Organisasi**
  1. Modul CRUD Periode Kepengurusan (`/dashboard/periode` - Admin only, status aktif/selesai read-only)
  2. Modul CRUD Data STO & Impor CSV (`/dashboard/sto` - Admin only)
  3. Modul CRUD Proker & Kepanitiaan (`/dashboard/proker` - peran PI, PJ, Anggota)
  4. Modul CRUD Agenda Kegiatan (`/dashboard/proker/[id]` - jenis agenda, target peserta)

### Bagian Labib
- **Modul C: Presensi & Real-Time Dashboard**
  1. API Sesi & Scan Presensi (Validasi 6 tahap, kalkulasi status hadir/terlambat, geolokasi 500m, HMAC QR 14 menit)
  2. Dashboard Presensi (`/dashboard/presensi/[sesi]` - tampilan proyektor QR dinamis & live attendance feed)
- **Modul D: Tampilan Web Presensi Buat Akses STO (Mobile-First)**
  1. Halaman Beranda STO (`/home` - 3 tab status & filter hak akses)
  2. Halaman Scanner Presensi (`/scan` - kamera QR scanner & koordinat GPS)
  3. Halaman Profil STO (`/profil`)

## 12. Pertanyaan terbuka

- Batas "terlambat" tetap 15 menit atau dibuat per sesi (`batas_terlambat_menit`)?
- Perlu waktu selesai agenda (`waktu_selesai`)?
- Adsek/admin pertama dibuat lewat skrip seed yang membuat pengguna Firebase dan baris `akun_adsek` sekaligus.
- Apakah STO yang bukan panitia boleh melihat agenda berlabel `semua_panitia_sto` dari proker yang bukan miliknya? (Asumsi v1: ya, selama satu periode.)
- Master `lokasi` bersifat global (tidak terikat periode) dan hanya admin yang boleh menambah/mengubah/menghapus. Perlu dikunci per periode juga (mis. lokasi ikut read-only saat periodenya selesai)?
- Perlukah tombol "pakai lokasi saya" untuk adsek juga saat membuat sesi tanpa master lokasi? (Saat ini sudah tersedia di pemilih peta.)
- Rate limit endpoint scan masih in-memory per proses (12 percobaan/menit per STO). Perlu pindah ke penyimpanan bersama bila deploy multi-instance?
- Izin v1 belum punya lampiran berkas (surat/foto). Perlu unggah bukti + penyimpanan (filesystem/objek)?
- Apakah izin perlu batas waktu pengajuan yang lebih awal daripada status agenda selesai?
- Poin "hadir terlambat tanpa izin" saat ini **-2**. Kalau maksud awal adalah 1 (dan -2 hanya untuk alpa), ubah `TERLAMBAT_TANPA_IZIN` di `lib/poin.ts`.
- Poin dihitung per sesi tertutup. Karena satu agenda kini boleh punya beberapa sesi, satu agenda = jumlah sesi tertutupnya.
- Verifikasi presensi luar radius: apakah perlu batas waktu peninjauan, dan apakah penolakan sebaiknya wajib disertai alasan?
