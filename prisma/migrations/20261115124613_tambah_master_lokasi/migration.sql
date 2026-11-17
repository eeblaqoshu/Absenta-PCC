-- Master lokasi presensi (titik + radius yang didaftarkan admin).
-- Catatan: migrasi ini TIDAK menyentuh `periode_satu_aktif` / `status_aktif_key`
-- karena keduanya migrasi manual (`20261115042623_periode_satu_aktif`).
-- AlterTable
ALTER TABLE `sesi_presensi` ADD COLUMN `lokasi_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `lokasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `lat` DECIMAL(9, 6) NOT NULL,
    `lng` DECIMAL(9, 6) NOT NULL,
    `radius_m` INTEGER NOT NULL DEFAULT 500,
    `dibuat_oleh` INTEGER NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `lokasi_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `sesi_presensi_lokasi_id_idx` ON `sesi_presensi`(`lokasi_id`);

-- AddForeignKey
ALTER TABLE `lokasi` ADD CONSTRAINT `lokasi_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `akun_adsek`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_presensi` ADD CONSTRAINT `sesi_presensi_lokasi_id_fkey` FOREIGN KEY (`lokasi_id`) REFERENCES `lokasi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
