-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "InvoiceVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "total" DECIMAL(65,30) NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "InvoiceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceVersion_invoiceId_idx" ON "InvoiceVersion"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceVersion_invoiceId_versionNumber_key" ON "InvoiceVersion"("invoiceId", "versionNumber");

-- AddForeignKey
ALTER TABLE "InvoiceVersion" ADD CONSTRAINT "InvoiceVersion_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
