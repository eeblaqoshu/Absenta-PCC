-- CreateTable
CREATE TABLE `periode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `tgl_mulai` DATE NOT NULL,
    `tgl_selesai` DATE NOT NULL,
    `status` ENUM('aktif', 'selesai') NOT NULL DEFAULT 'aktif',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `akun_adsek` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firebase_uid` VARCHAR(191) NULL,
    `role` ENUM('admin', 'sekretaris_umum', 'sekretaris_inti') NOT NULL,

    UNIQUE INDEX `akun_adsek_email_key`(`email`),
    UNIQUE INDEX `akun_adsek_firebase_uid_key`(`firebase_uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `STO` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periode_id` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nim` VARCHAR(191) NOT NULL,
    `email_google` VARCHAR(191) NOT NULL,
    `firebase_uid` VARCHAR(191) NULL,
    `jabatan` VARCHAR(191) NULL,
    `divisi` VARCHAR(191) NULL,
    `foto` VARCHAR(191) NULL,

    UNIQUE INDEX `STO_email_google_key`(`email_google`),
    UNIQUE INDEX `STO_firebase_uid_key`(`firebase_uid`),
    INDEX `STO_periode_id_idx`(`periode_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `periode_id` INTEGER NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `dibuat_oleh` INTEGER NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `proker_periode_id_idx`(`periode_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kepanitiaan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proker_id` INTEGER NOT NULL,
    `sto_id` INTEGER NOT NULL,
    `peran` ENUM('ketua', 'sekretaris', 'bendahara', 'pj_divisi', 'anggota') NOT NULL,
    `divisi_panitia` VARCHAR(191) NULL,

    INDEX `kepanitiaan_sto_id_idx`(`sto_id`),
    UNIQUE INDEX `kepanitiaan_proker_id_sto_id_key`(`proker_id`, `sto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agenda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proker_id` INTEGER NOT NULL,
    `jenis` ENUM('rapat_pj', 'rapat_besar', 'rapat_koordinasi', 'hari_h') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 1,
    `tgl_pelaksanaan` DATE NOT NULL,
    `waktu_pelaksanaan` TIME(0) NOT NULL,
    `lokasi_nama` VARCHAR(191) NULL,
    `target_peserta` ENUM('hanya_pj_pi', 'semua_panitia', 'semua_panitia_sto') NOT NULL,
    `dibuat_oleh` INTEGER NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `agenda_proker_id_tgl_pelaksanaan_idx`(`proker_id`, `tgl_pelaksanaan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesi_presensi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agenda_id` INTEGER NOT NULL,
    `dibuat_oleh` INTEGER NOT NULL,
    `buka_at` DATETIME(6) NOT NULL,
    `tutup_at` DATETIME(6) NOT NULL,
    `durasi_menit` INTEGER NOT NULL,
    `lat` DECIMAL(9, 6) NOT NULL,
    `lng` DECIMAL(9, 6) NOT NULL,
    `radius_m` INTEGER NOT NULL DEFAULT 500,
    `qr_secret` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `sesi_presensi_agenda_id_idx`(`agenda_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `presensi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sesi_id` INTEGER NOT NULL,
    `sto_id` INTEGER NOT NULL,
    `waktu_scan` DATETIME(6) NOT NULL,
    `lat` DECIMAL(9, 6) NOT NULL,
    `lng` DECIMAL(9, 6) NOT NULL,
    `jarak_m` INTEGER NOT NULL,
    `status` ENUM('hadir', 'terlambat') NOT NULL,

    INDEX `presensi_sto_id_idx`(`sto_id`),
    UNIQUE INDEX `presensi_sesi_id_sto_id_key`(`sesi_id`, `sto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `STO` ADD CONSTRAINT `STO_periode_id_fkey` FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proker` ADD CONSTRAINT `proker_periode_id_fkey` FOREIGN KEY (`periode_id`) REFERENCES `periode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `proker` ADD CONSTRAINT `proker_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `akun_adsek`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kepanitiaan` ADD CONSTRAINT `kepanitiaan_proker_id_fkey` FOREIGN KEY (`proker_id`) REFERENCES `proker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kepanitiaan` ADD CONSTRAINT `kepanitiaan_sto_id_fkey` FOREIGN KEY (`sto_id`) REFERENCES `STO`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agenda` ADD CONSTRAINT `agenda_proker_id_fkey` FOREIGN KEY (`proker_id`) REFERENCES `proker`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agenda` ADD CONSTRAINT `agenda_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `akun_adsek`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_presensi` ADD CONSTRAINT `sesi_presensi_agenda_id_fkey` FOREIGN KEY (`agenda_id`) REFERENCES `agenda`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_presensi` ADD CONSTRAINT `sesi_presensi_dibuat_oleh_fkey` FOREIGN KEY (`dibuat_oleh`) REFERENCES `akun_adsek`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `presensi` ADD CONSTRAINT `presensi_sesi_id_fkey` FOREIGN KEY (`sesi_id`) REFERENCES `sesi_presensi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `presensi` ADD CONSTRAINT `presensi_sto_id_fkey` FOREIGN KEY (`sto_id`) REFERENCES `STO`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
