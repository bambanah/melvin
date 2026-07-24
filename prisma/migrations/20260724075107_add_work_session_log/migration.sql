-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('TRAVEL', 'IN_PLACE');

-- CreateTable
CREATE TABLE "WorkSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "startTime" TIME(6) NOT NULL,
    "endTime" TIME(6),
    "ownerId" TEXT NOT NULL,
    "precededByWorkSessionId" TEXT,
    "handoverType" "HandoverType",
    "interClientDistance" DECIMAL(65,30),
    "interClientDuration" DECIMAL(65,30),

    CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSessionParticipant" (
    "workSessionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "WorkSessionParticipant_pkey" PRIMARY KEY ("workSessionId","clientId")
);

-- CreateTable
CREATE TABLE "WorkSessionTransportItem" (
    "id" TEXT NOT NULL,
    "workSessionId" TEXT NOT NULL,
    "type" "ActivityTransportType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,

    CONSTRAINT "WorkSessionTransportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkSession_precededByWorkSessionId_key" ON "WorkSession"("precededByWorkSessionId");

-- CreateIndex
CREATE INDEX "WorkSession_ownerId_idx" ON "WorkSession"("ownerId");

-- CreateIndex
CREATE INDEX "WorkSession_ownerId_date_startTime_idx" ON "WorkSession"("ownerId", "date", "startTime");

-- CreateIndex
CREATE INDEX "WorkSessionParticipant_clientId_idx" ON "WorkSessionParticipant"("clientId");

-- CreateIndex
CREATE INDEX "WorkSessionTransportItem_workSessionId_idx" ON "WorkSessionTransportItem"("workSessionId");

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_precededByWorkSessionId_fkey" FOREIGN KEY ("precededByWorkSessionId") REFERENCES "WorkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSessionParticipant" ADD CONSTRAINT "WorkSessionParticipant_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSessionParticipant" ADD CONSTRAINT "WorkSessionParticipant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSessionTransportItem" ADD CONSTRAINT "WorkSessionTransportItem_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
