-- Hanya satu periode yang boleh berstatus 'aktif' (PRD: hanya satu periode aktif).
-- MySQL tidak punya partial index, jadi pakai generated column + unique index.
-- Kolom bernilai NULL untuk periode 'selesai' (NULL boleh berulang di unique index).
ALTER TABLE `periode`
    ADD COLUMN `status_aktif_key` TINYINT
        AS (IF(`status` = 'aktif', 1, NULL)) STORED,
    ADD UNIQUE INDEX `periode_satu_aktif` (`status_aktif_key`);
