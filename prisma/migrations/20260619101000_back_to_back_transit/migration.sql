-- Convert existing round-trip transit values to one-way (divide by 2)
UPDATE "Client" SET "defaultTransitDistance" = "defaultTransitDistance" / 2 WHERE "defaultTransitDistance" IS NOT NULL;
UPDATE "Client" SET "defaultTransitTime" = "defaultTransitTime" / 2 WHERE "defaultTransitTime" IS NOT NULL;

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "tripId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "transitRatePerKm" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "transitRatePerKm" DECIMAL(65,30) NOT NULL DEFAULT 0.85;

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterClientLeg" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromActivityId" TEXT NOT NULL,
    "toActivityId" TEXT NOT NULL,
    "distance" DECIMAL(65,30) NOT NULL,
    "duration" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "InterClientLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_ownerId_idx" ON "Trip"("ownerId");

-- CreateIndex
CREATE INDEX "Trip_ownerId_date_idx" ON "Trip"("ownerId", "date");

-- CreateIndex
CREATE INDEX "InterClientLeg_tripId_idx" ON "InterClientLeg"("tripId");

-- CreateIndex
CREATE INDEX "Activity_tripId_idx" ON "Activity"("tripId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterClientLeg" ADD CONSTRAINT "InterClientLeg_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
