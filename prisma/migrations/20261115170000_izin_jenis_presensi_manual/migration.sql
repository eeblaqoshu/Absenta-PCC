-- Jenis/label izin STO (mis. "terlambat") dan koreksi menit keterlambatan
-- + absensi manual oleh adsek.

ALTER TABLE `izin`
    ADD COLUMN `jenis` ENUM('terlambat', 'sakit', 'izin', 'lainnya') NOT NULL DEFAULT 'izin';

ALTER TABLE `presensi`
    ADD COLUMN `menit_terlambat` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `manual` BOOLEAN NOT NULL DEFAULT false;
