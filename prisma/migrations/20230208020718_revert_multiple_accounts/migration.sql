-- DropForeignKey
ALTER TABLE `Account` DROP FOREIGN KEY `Account_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_invoiceId_fkey`;

-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `Activity` DROP FOREIGN KEY `Activity_supportItemId_fkey`;

-- DropForeignKey
ALTER TABLE `Client` DROP FOREIGN KEY `Client_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropForeignKey
ALTER TABLE `SupportItem` DROP FOREIGN KEY `SupportItem_ownerId_fkey`;

-- RenameIndex
ALTER TABLE `Activity` RENAME INDEX `Activity_clientId_fkey` TO `Activity_clientId_idx`;

-- RenameIndex
ALTER TABLE `Activity` RENAME INDEX `Activity_invoiceId_fkey` TO `Activity_invoiceId_idx`;

-- RenameIndex
ALTER TABLE `Activity` RENAME INDEX `Activity_ownerId_fkey` TO `Activity_ownerId_idx`;

-- RenameIndex
ALTER TABLE `Activity` RENAME INDEX `Activity_supportItemId_fkey` TO `Activity_supportItemId_idx`;

-- RenameIndex
ALTER TABLE `Client` RENAME INDEX `Client_ownerId_fkey` TO `Client_ownerId_idx`;

-- RenameIndex
ALTER TABLE `Invoice` RENAME INDEX `Invoice_clientId_fkey` TO `Invoice_clientId_idx`;

-- RenameIndex
ALTER TABLE `Invoice` RENAME INDEX `Invoice_ownerId_fkey` TO `Invoice_ownerId_idx`;

-- RenameIndex
ALTER TABLE `Session` RENAME INDEX `Session_userId_fkey` TO `Session_userId_idx`;

-- RenameIndex
ALTER TABLE `SupportItem` RENAME INDEX `SupportItem_ownerId_fkey` TO `SupportItem_ownerId_idx`;
