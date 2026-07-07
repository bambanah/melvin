-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "groupSize" INTEGER;

-- Backfill: existing group activities were all created with exactly 2
-- participants (docs/plans/016) — every isGroup activity gets groupSize = 2.
UPDATE "Activity" SET "groupSize" = 2 WHERE "supportItemId" IN (SELECT id FROM "SupportItem" WHERE "isGroup" = true);

-- Rate-semantics migration (docs/plans/016, operator decision 3): a group
-- support item's stored rates move from "per-participant" to "full-session"
-- meaning, so billing (which now divides by groupSize) reproduces the same
-- per-participant cents for existing N=2 groups.
UPDATE "SupportItem"
SET "weekdayRate" = "weekdayRate" * 2,
    "weeknightRate" = "weeknightRate" * 2,
    "saturdayRate" = "saturdayRate" * 2,
    "sundayRate" = "sundayRate" * 2
WHERE "isGroup" = true;

UPDATE "SupportItemRates"
SET "weekdayRate" = "weekdayRate" * 2,
    "weeknightRate" = "weeknightRate" * 2,
    "saturdayRate" = "saturdayRate" * 2,
    "sundayRate" = "sundayRate" * 2
WHERE "supportItemId" IN (SELECT id FROM "SupportItem" WHERE "isGroup" = true);
