/*
  Warnings:

  - The `weeknightRate` column on the `SupportItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `saturdayRate` column on the `SupportItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sundayRate` column on the `SupportItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `weekdayRate` on the `SupportItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "itemDistance" INTEGER;

-- AlterTable
ALTER TABLE "SupportItem" DROP COLUMN "weekdayRate",
ADD COLUMN     "weekdayRate" DECIMAL(65,30) NOT NULL,
DROP COLUMN "weeknightRate",
ADD COLUMN     "weeknightRate" DECIMAL(65,30),
DROP COLUMN "saturdayRate",
ADD COLUMN     "saturdayRate" DECIMAL(65,30),
DROP COLUMN "sundayRate",
ADD COLUMN     "sundayRate" DECIMAL(65,30);
