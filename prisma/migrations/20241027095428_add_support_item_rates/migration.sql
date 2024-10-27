-- CreateTable
CREATE TABLE "SupportItemRates" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "supportItemId" TEXT NOT NULL,
    "clientId" TEXT,
    "weekdayRate" DECIMAL(65,30),
    "weeknightRate" DECIMAL(65,30),
    "saturdayRate" DECIMAL(65,30),
    "sundayRate" DECIMAL(65,30),

    CONSTRAINT "SupportItemRates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportItemRates_supportItemId_idx" ON "SupportItemRates"("supportItemId");

-- CreateIndex
CREATE INDEX "SupportItemRates_ownerId_idx" ON "SupportItemRates"("ownerId");

-- CreateIndex
CREATE INDEX "SupportItemRates_clientId_idx" ON "SupportItemRates"("clientId");
