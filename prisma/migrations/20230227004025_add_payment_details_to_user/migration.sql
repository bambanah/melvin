-- AlterTable
ALTER TABLE `Client` ADD COLUMN `invoiceNumberPrefix` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PaymentDetails` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `abn` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `bankNumber` INTEGER NOT NULL,
    `bsb` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,

    INDEX `PaymentDetails_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
