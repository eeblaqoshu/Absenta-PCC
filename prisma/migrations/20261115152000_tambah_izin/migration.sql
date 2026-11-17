-- Tabel izin: pengajuan izin STO per agenda, ditinjau adsek.
-- Catatan: migrasi ini TIDAK menyentuh `periode_satu_aktif` / `status_aktif_key`
-- karena keduanya migrasi manual (`20261115042623_periode_satu_aktif`).
-- CreateTable
CREATE TABLE `izin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agenda_id` INTEGER NOT NULL,
    `sto_id` INTEGER NOT NULL,
    `alasan` VARCHAR(191) NOT NULL,
    `status` ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'menunggu',
    `ditinjau_oleh` INTEGER NULL,
    `ditinjau_at` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `izin_sto_id_idx`(`sto_id`),
    INDEX `izin_status_idx`(`status`),
    UNIQUE INDEX `izin_agenda_id_sto_id_key`(`agenda_id`, `sto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `izin` ADD CONSTRAINT `izin_agenda_id_fkey` FOREIGN KEY (`agenda_id`) REFERENCES `agenda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `izin` ADD CONSTRAINT `izin_sto_id_fkey` FOREIGN KEY (`sto_id`) REFERENCES `STO`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `izin` ADD CONSTRAINT `izin_ditinjau_oleh_fkey` FOREIGN KEY (`ditinjau_oleh`) REFERENCES `akun_adsek`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
