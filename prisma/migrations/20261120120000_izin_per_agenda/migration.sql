-- Pindahkan pengajuan izin dari sesi ke agenda.
-- Jika STO punya beberapa izin sesi pada agenda yang sama, pertahankan pengajuan
-- terbaru agar terbentuk satu izin per pasangan agenda + STO.
ALTER TABLE `izin` ADD COLUMN `agenda_id` INTEGER NULL;

UPDATE `izin` i
JOIN `sesi_presensi` s ON s.`id` = i.`sesi_id`
SET i.`agenda_id` = s.`agenda_id`;

DELETE older FROM `izin` older
JOIN `izin` newer
  ON newer.`agenda_id` = older.`agenda_id`
  AND newer.`sto_id` = older.`sto_id`
  AND (
    newer.`created_at` > older.`created_at`
    OR (newer.`created_at` = older.`created_at` AND newer.`id` > older.`id`)
  );

ALTER TABLE `izin` DROP FOREIGN KEY `izin_sesi_id_fkey`;
ALTER TABLE `izin` DROP INDEX `izin_sesi_id_sto_id_key`;
ALTER TABLE `izin` DROP COLUMN `sesi_id`;
ALTER TABLE `izin` MODIFY COLUMN `agenda_id` INTEGER NOT NULL;

CREATE UNIQUE INDEX `izin_agenda_id_sto_id_key` ON `izin`(`agenda_id`, `sto_id`);
ALTER TABLE `izin`
  ADD CONSTRAINT `izin_agenda_id_fkey`
  FOREIGN KEY (`agenda_id`) REFERENCES `agenda`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
