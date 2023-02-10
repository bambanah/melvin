-- AlterTable
ALTER TABLE
  `Activity`
ADD
  COLUMN `clientId` VARCHAR(191);

UPDATE
  `Activity`
SET
  `clientId` = (
    SELECT
      `clientId`
    FROM
      `Invoice`
    WHERE
      `Activity`.`invoiceId` = `Invoice`.`id`
  );

UPDATE
  `Activity`
SET
  `clientId` = 'no_client'
WHERE
  `clientId` IS NULL;

ALTER TABLE
  `Activity`
MODIFY
  COLUMN `clientId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE
  `Activity`
ADD
  CONSTRAINT `Activity_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;