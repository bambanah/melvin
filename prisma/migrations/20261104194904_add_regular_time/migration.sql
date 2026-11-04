-- CreateTable
CREATE TABLE "RegularTime" (
    "clientId" TEXT NOT NULL,
    "startTime" TIME(6) NOT NULL,
    "endTime" TIME(6) NOT NULL,
    "supportItemId" TEXT NOT NULL,
    "claimsTravel" BOOLEAN NOT NULL,

    CONSTRAINT "RegularTime_pkey" PRIMARY KEY ("clientId")
);

-- CreateIndex
CREATE INDEX "RegularTime_supportItemId_idx" ON "RegularTime"("supportItemId");

-- AddForeignKey
ALTER TABLE "RegularTime" ADD CONSTRAINT "RegularTime_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegularTime" ADD CONSTRAINT "RegularTime_supportItemId_fkey" FOREIGN KEY ("supportItemId") REFERENCES "SupportItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
