-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_invoiceId_fkey`;

-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_supportItemId_fkey`;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_supportItemId_fkey` FOREIGN KEY (`supportItemId`) REFERENCES `SupportItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
