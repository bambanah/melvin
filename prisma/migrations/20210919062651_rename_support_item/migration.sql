/*
  Warnings:

  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_itemDataId_fkey";

-- DropForeignKey
ALTER TABLE "ItemData" DROP CONSTRAINT "ItemData_ownerId_fkey";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "ItemData";

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "itemDuration" INTEGER NOT NULL,
    "transitDuration" INTEGER,
    "transitDistance" INTEGER,
    "invoiceId" TEXT NOT NULL,
    "supportItemId" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportItem" (
    "id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "rateType" "RateType" NOT NULL,
    "weekdayCode" TEXT NOT NULL,
    "weekdayRate" TEXT NOT NULL,
    "weeknightCode" TEXT,
    "weeknightRate" TEXT,
    "saturdayCode" TEXT,
    "saturdayRate" TEXT,
    "sundayCode" TEXT,
    "sundayRate" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "SupportItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_supportItemId_fkey" FOREIGN KEY ("supportItemId") REFERENCES "SupportItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportItem" ADD CONSTRAINT "SupportItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
