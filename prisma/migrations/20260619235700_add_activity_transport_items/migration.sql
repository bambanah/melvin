-- CreateEnum
CREATE TYPE "ActivityTransportType" AS ENUM ('DISTANCE', 'PARKING', 'TOLL', 'OTHER');

-- CreateTable
CREATE TABLE "ActivityTransportItem" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "type" "ActivityTransportType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,

    CONSTRAINT "ActivityTransportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityTransportItem_activityId_idx" ON "ActivityTransportItem"("activityId");

-- AddForeignKey
ALTER TABLE "ActivityTransportItem" ADD CONSTRAINT "ActivityTransportItem_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
