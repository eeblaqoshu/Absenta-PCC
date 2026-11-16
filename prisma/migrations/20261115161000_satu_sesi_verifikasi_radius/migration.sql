-- Satu sesi presensi per agenda + verifikasi presensi di luar radius.
-- Radius tidak lagi menggagalkan presensi: jarak dicatat dan adsek meninjau.

-- 1. Satu agenda hanya boleh punya satu sesi presensi.
CREATE UNIQUE INDEX `sesi_presensi_agenda_id_key` ON `sesi_presensi`(`agenda_id`);

-- 2. Presensi di luar radius tetap dicatat, menunggu verifikasi adsek.
ALTER TABLE `presensi`
  ADD COLUMN `di_luar_radius` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `status_verifikasi` ENUM('menunggu', 'diterima', 'ditolak') NOT NULL DEFAULT 'diterima';

CREATE INDEX `presensi_status_verifikasi_idx` ON `presensi`(`status_verifikasi`);
