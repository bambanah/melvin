/*
  Warnings:

  - You are about to drop the `PaymentDetails` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE `User` ADD COLUMN `abn` VARCHAR(191) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `bankNumber` INTEGER NULL,
    ADD COLUMN `bsb` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `PaymentDetails`;
