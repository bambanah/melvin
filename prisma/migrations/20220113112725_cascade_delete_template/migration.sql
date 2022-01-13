-- DropForeignKey
ALTER TABLE "Template" DROP CONSTRAINT "Template_invoiceId_fkey";

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
