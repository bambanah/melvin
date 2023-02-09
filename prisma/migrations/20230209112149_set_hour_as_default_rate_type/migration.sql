-- AlterTable
ALTER TABLE `SupportItem` MODIFY `rateType` ENUM('KM', 'HOUR') NOT NULL DEFAULT 'HOUR';
