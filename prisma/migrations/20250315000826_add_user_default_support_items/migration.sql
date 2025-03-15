-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultGroupSupportItemId" TEXT,
ADD COLUMN     "defaultSupportItemId" TEXT;

-- CreateIndex
CREATE INDEX "User_defaultSupportItemId_idx" ON "User"("defaultSupportItemId");

-- CreateIndex
CREATE INDEX "User_defaultGroupSupportItemId_idx" ON "User"("defaultGroupSupportItemId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultSupportItemId_fkey" FOREIGN KEY ("defaultSupportItemId") REFERENCES "SupportItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultGroupSupportItemId_fkey" FOREIGN KEY ("defaultGroupSupportItemId") REFERENCES "SupportItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
