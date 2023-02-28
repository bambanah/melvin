/*
  Warnings:

  - You are about to alter the column `abn` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `bsb` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `User` MODIFY `abn` INTEGER NULL,
    MODIFY `bsb` INTEGER NULL;
