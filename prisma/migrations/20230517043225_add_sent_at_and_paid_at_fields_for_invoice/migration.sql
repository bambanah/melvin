-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `sentAt` DATETIME(3) NULL;
