// prisma/seed.ts
// Data simulasi awal untuk pengujian lokal sesuai PRD
import {
  PrismaClient,
  StatusPeriode,
  RoleAdsek,
  PeranPanitia,
  JenisAgenda,
  TargetPeserta,
  JenisIzin,
  StatusIzin,
} from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

/** Konstanta jendela QR (sama dengan lib/konstanta.ts) — dipakai hanya untuk seed. */
function qrSecret() {
  return crypto.randomBytes(32).toString("hex");
}

async function main() {
  console.log("🌱 Memulai seeding data simulasi...");

  // 1. Bersihkan database terlebih dahulu (urutan penghapusan sesuai relasi)
  await prisma.izin.deleteMany();
  await prisma.presensi.deleteMany();
  await prisma.sesiPresensi.deleteMany();
  await prisma.agenda.deleteMany();
  await prisma.kepanitiaan.deleteMany();
  await prisma.proker.deleteMany();
  await prisma.sto.deleteMany();
  await prisma.lokasi.deleteMany();
  await prisma.akunAdsek.deleteMany();
  await prisma.periode.deleteMany();

  // 2. Buat Periode Aktif
  const periode = await prisma.periode.create({
    data: {
      nama: "Periode Kepengurusan 2026/2027",
      tglMulai: new Date("2026-01-01"),
      tglSelesai: new Date("2026-12-31"),
      status: StatusPeriode.aktif,
    },
  });
  console.log(`✅ Periode dibuat: ${periode.nama}`);

  // 3. Buat Akun Adsek
  const adminUser = await prisma.akunAdsek.create({
    data: {
      nama: "Admin Utama PCC",
      email: "admin@pcc.polines.ac.id",
      role: RoleAdsek.admin,
    },
  });

  const sekumUser = await prisma.akunAdsek.create({
    data: {
      nama: "Sekretaris Umum",
      email: "sekum@pcc.polines.ac.id",
      role: RoleAdsek.sekretaris_umum,
    },
  });

  console.log("✅ Akun Adsek dibuat (admin & sekum)");

  // 4. Buat Data STO (Pengurus Organisasi)
  const sto1 = await prisma.sto.create({
    data: {
      periodeId: periode.id,
      nama: "Muhammad Albi",
      nim: "3.34.22.0.01",
      emailGoogle: "albi@student.polines.ac.id",
      jabatan: "Ketua Umum",
      divisi: "Pengurus Harian",
    },
  });

  const sto2 = await prisma.sto.create({
    data: {
      periodeId: periode.id,
      nama: "Budi Santoso",
      nim: "3.34.22.0.02",
      emailGoogle: "budi@student.polines.ac.id",
      jabatan: "Koordinator Divisi Web Development",
      divisi: "Web Development",
    },
  });

  const sto3 = await prisma.sto.create({
    data: {
      periodeId: periode.id,
      nama: "Citra Lestari",
      nim: "3.34.22.0.03",
      emailGoogle: "citra@student.polines.ac.id",
      jabatan: "Staff Hubungan Masyarakat",
      divisi: "Humas",
    },
  });

  console.log("✅ 3 Anggota STO dibuat");

  // 5. Buat Proker
  const proker = await prisma.proker.create({
    data: {
      periodeId: periode.id,
      nama: "PCC National IT Festival 2026",
      deskripsi: "Seminar dan Lomba Teknologi Nasional tahunan UKM PCC",
      dibuatOleh: adminUser.id,
    },
  });

  console.log(`✅ Proker dibuat: ${proker.nama}`);

  // 6. Buat Kepanitiaan Proker
  // sto1 -> Ketua Pelaksana (PI)
  await prisma.kepanitiaan.create({
    data: {
      prokerId: proker.id,
      stoId: sto1.id,
      peran: PeranPanitia.ketua,
      divisiPanitia: "Panitia Inti",
    },
  });

  // sto2 -> PJ Acara (PJ)
  await prisma.kepanitiaan.create({
    data: {
      prokerId: proker.id,
      stoId: sto2.id,
      peran: PeranPanitia.pj_divisi,
      divisiPanitia: "Divisi Acara",
    },
  });

  // sto3 -> Anggota Konsumsi (bukan PJ/PI)
  await prisma.kepanitiaan.create({
    data: {
      prokerId: proker.id,
      stoId: sto3.id,
      peran: PeranPanitia.anggota,
      divisiPanitia: "Divisi Konsumsi",
    },
  });

  console.log("✅ Kepanitiaan proker dibuat (Ketua, PJ, Anggota)");

  // 7. Master lokasi presensi (titik + radius; dipilih adsek saat mengatur titik agenda)
  const lokasiRapat = await prisma.lokasi.create({
    data: {
      nama: "Ruang Rapat UKM PCC Polines",
      lat: -6.9767,
      lng: 110.4106,
      radiusM: 100,
      dibuatOleh: sekumUser.id,
    },
  });

  const lokasiGedung = await prisma.lokasi.create({
    data: {
      nama: "Gedung Serbaguna Polines",
      lat: -6.9752,
      lng: 110.4121,
      radiusM: 300,
      dibuatOleh: adminUser.id,
    },
  });

  const lokasiAuditorium = await prisma.lokasi.create({
    data: {
      nama: "Auditorium Polines",
      lat: -6.9731,
      lng: 110.4152,
      radiusM: 500,
      dibuatOleh: adminUser.id,
    },
  });

  console.log("✅ 3 Master lokasi dibuat");

  // 8. Agenda (rentang tanggal + titik presensi dari master lokasi).
  // Agenda 1: Rapat PJ & PI (hanya_pj_pi)
  const agenda1 = await prisma.agenda.create({
    data: {
      prokerId: proker.id,
      jenis: JenisAgenda.rapat_pj,
      judul: "Rapat Koordinasi PJ & Pengurus Inti",
      urutan: 1,
      tglPelaksanaan: new Date("2026-11-10"),
      waktuPelaksanaan: new Date("1970-01-01T15:00:00Z"),
      lokasiNama: lokasiRapat.nama,
      lokasiId: lokasiRapat.id,
      lat: lokasiRapat.lat,
      lng: lokasiRapat.lng,
      radiusM: lokasiRapat.radiusM,
      targetPeserta: TargetPeserta.hanya_pj_pi,
      dibuatOleh: sekumUser.id,
    },
  });

  // Agenda 2: Rapat Besar Panitia (semua_panitia)
  const agenda2 = await prisma.agenda.create({
    data: {
      prokerId: proker.id,
      jenis: JenisAgenda.rapat_besar,
      judul: "Rapat Pleno 1 Seluruh Panitia",
      urutan: 2,
      tglPelaksanaan: new Date("2026-11-15"),
      waktuPelaksanaan: new Date("1970-01-01T16:30:00Z"),
      lokasiNama: lokasiGedung.nama,
      lokasiId: lokasiGedung.id,
      lat: lokasiGedung.lat,
      lng: lokasiGedung.lng,
      radiusM: lokasiGedung.radiusM,
      targetPeserta: TargetPeserta.semua_panitia,
      dibuatOleh: sekumUser.id,
    },
  });

  // Agenda 3: Hari H multi-hari (20–21 Nov 2026), semua_panitia_sto
  const agenda3 = await prisma.agenda.create({
    data: {
      prokerId: proker.id,
      jenis: JenisAgenda.hari_h,
      judul: "Hari-H National IT Festival",
      urutan: 3,
      tglPelaksanaan: new Date("2026-11-20"),
      tglSelesai: new Date("2026-11-21"),
      waktuPelaksanaan: new Date("1970-01-01T08:00:00Z"),
      lokasiNama: lokasiAuditorium.nama,
      lokasiId: lokasiAuditorium.id,
      lat: lokasiAuditorium.lat,
      lng: lokasiAuditorium.lng,
      radiusM: lokasiAuditorium.radiusM,
      targetPeserta: TargetPeserta.semua_panitia_sto,
      dibuatOleh: adminUser.id,
    },
  });

  console.log("✅ 3 Agenda dibuat (1 agenda multi-hari)");

  // 9. Sesi presensi per agenda (boleh lebih dari satu per agenda).
  // Jam disimpan UTC: 15:00 WIB = 08:00Z.
  await prisma.sesiPresensi.create({
    data: {
      agendaId: agenda1.id,
      dibuatOleh: sekumUser.id,
      bukaAt: new Date("2026-11-10T08:00:00Z"),
      tutupAt: new Date("2026-11-10T09:00:00Z"),
      qrSecret: qrSecret(),
    },
  });

  await prisma.sesiPresensi.create({
    data: {
      agendaId: agenda2.id,
      dibuatOleh: sekumUser.id,
      bukaAt: new Date("2026-11-15T09:30:00Z"),
      tutupAt: new Date("2026-11-15T10:30:00Z"),
      qrSecret: qrSecret(),
    },
  });

  // Dua sesi pada agenda hari H (dua hari berbeda).
  await prisma.sesiPresensi.create({
    data: {
      agendaId: agenda3.id,
      dibuatOleh: adminUser.id,
      bukaAt: new Date("2026-11-20T01:00:00Z"),
      tutupAt: new Date("2026-11-20T02:00:00Z"),
      qrSecret: qrSecret(),
    },
  });

  await prisma.sesiPresensi.create({
    data: {
      agendaId: agenda3.id,
      dibuatOleh: adminUser.id,
      bukaAt: new Date("2026-11-21T01:00:00Z"),
      tutupAt: new Date("2026-11-21T02:00:00Z"),
      qrSecret: qrSecret(),
    },
  });

  console.log("✅ 4 Sesi presensi dibuat (agenda hari H punya 2 sesi)");

  // 10. Contoh izin: diajukan per agenda, sebelum atau sesudah sesi dibuat.
  await prisma.izin.create({
    data: {
      agendaId: agenda1.id,
      stoId: sto1.id,
      jenis: JenisIzin.sakit,
      alasan: "Demam tinggi, ada surat keterangan dokter.",
      status: StatusIzin.menunggu,
    },
  });

  await prisma.izin.create({
    data: {
      agendaId: agenda2.id,
      stoId: sto3.id,
      jenis: JenisIzin.izin,
      alasan: "Ada kelas praktikum wajib di kampus.",
      status: StatusIzin.disetujui,
      ditinjauOleh: sekumUser.id,
      ditinjauAt: new Date(),
    },
  });

  console.log("✅ 2 Contoh izin per agenda dibuat");
  console.log("🎉 Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
