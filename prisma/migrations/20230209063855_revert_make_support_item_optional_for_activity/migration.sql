/*
  Warnings:

  - Made the column `supportItemId` on table `Activity` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Activity` MODIFY `supportItemId` VARCHAR(191) NOT NULL;
