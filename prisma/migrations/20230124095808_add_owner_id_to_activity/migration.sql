-- AlterTable
ALTER TABLE
  `Activity`
ADD
  COLUMN `ownerId` VARCHAR(191);

UPDATE
  `Activity`
SET
  `ownerId` = (
    SELECT
      `ownerId`
    FROM
      `Invoice`
    WHERE
      `Activity`.`invoiceId` = `Invoice`.`id`
  );

ALTER TABLE
  `Activity`
MODIFY
  COLUMN `ownerId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE
  `Activity`
ADD
  CONSTRAINT `Activity_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;