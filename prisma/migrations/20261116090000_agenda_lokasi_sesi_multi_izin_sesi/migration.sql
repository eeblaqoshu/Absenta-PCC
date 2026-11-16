-- Agenda: rentang tanggal multi-hari + titik presensi (snapshot dari master lokasi)
ALTER TABLE `agenda`
  ADD COLUMN `tgl_selesai` DATE NULL,
  ADD COLUMN `lokasi_id` INTEGER NULL,
  ADD COLUMN `lat` DECIMAL(9, 6) NULL,
  ADD COLUMN `lng` DECIMAL(9, 6) NULL,
  ADD COLUMN `radius_m` INTEGER NULL;

-- Pindahkan snapshot titik dari sesi lama ke agenda (sesi tidak lagi menyimpan koordinat).
UPDATE `agenda` a
JOIN (
  SELECT `agenda_id`,
         MIN(`lat`) AS lat,
         MIN(`lng`) AS lng,
         MIN(`radius_m`) AS radius_m
  FROM `sesi_presensi`
  WHERE `lat` IS NOT NULL AND `lng` IS NOT NULL
  GROUP BY `agenda_id`
) s ON s.`agenda_id` = a.`id`
SET a.`lat` = COALESCE(a.`lat`, s.lat),
    a.`lng` = COALESCE(a.`lng`, s.lng),
    a.`radius_m` = COALESCE(a.`radius_m`, s.radius_m)
WHERE a.`lat` IS NULL;

-- Cocokkan kembali ke master lokasi bila koordinatnya identik.
UPDATE `agenda` a
JOIN `lokasi` l ON l.`lat` = a.`lat` AND l.`lng` = a.`lng`
SET a.`lokasi_id` = l.`id`
WHERE a.`lokasi_id` IS NULL;

-- Sesi: satu agenda boleh punya banyak sesi.
ALTER TABLE `sesi_presensi` DROP INDEX `sesi_presensi_agenda_id_key`;

-- Sesi tidak lagi menyimpan titik/radius (dipakai dari agenda) dan durasi.
ALTER TABLE `sesi_presensi` DROP FOREIGN KEY `sesi_presensi_lokasi_id_fkey`;
ALTER TABLE `sesi_presensi`
  DROP COLUMN `lokasi_id`,
  DROP COLUMN `lat`,
  DROP COLUMN `lng`,
  DROP COLUMN `radius_m`,
  DROP COLUMN `durasi_menit`;

-- Izin: dari per agenda menjadi per sesi.
ALTER TABLE `izin` ADD COLUMN `sesi_id` INTEGER NULL;

UPDATE `izin` i
JOIN (
  SELECT `agenda_id`, MIN(`id`) AS sesi_id
  FROM `sesi_presensi`
  GROUP BY `agenda_id`
) s ON s.`agenda_id` = i.`agenda_id`
SET i.`sesi_id` = s.sesi_id;

-- Izin tanpa sesi tidak bisa dipetakan (izin kini melekat ke sesi) -> hapus.
DELETE FROM `izin` WHERE `sesi_id` IS NULL;

ALTER TABLE `izin` DROP FOREIGN KEY `izin_agenda_id_fkey`;
ALTER TABLE `izin` DROP INDEX `izin_agenda_id_sto_id_key`;
ALTER TABLE `izin` DROP COLUMN `agenda_id`;
ALTER TABLE `izin` MODIFY COLUMN `sesi_id` INTEGER NOT NULL;

CREATE UNIQUE INDEX `izin_sesi_id_sto_id_key` ON `izin`(`sesi_id`, `sto_id`);
ALTER TABLE `izin`
  ADD CONSTRAINT `izin_sesi_id_fkey`
  FOREIGN KEY (`sesi_id`) REFERENCES `sesi_presensi`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Relasi agenda -> master lokasi.
ALTER TABLE `agenda`
  ADD CONSTRAINT `agenda_lokasi_id_fkey`
  FOREIGN KEY (`lokasi_id`) REFERENCES `lokasi`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `agenda_lokasi_id_idx` ON `agenda`(`lokasi_id`);