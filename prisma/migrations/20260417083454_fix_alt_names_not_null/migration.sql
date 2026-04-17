-- AlterTable
UPDATE "units" SET "alt_names" = ARRAY[]::TEXT[] WHERE "alt_names" IS NULL;
ALTER TABLE "units" ALTER COLUMN "alt_names" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "units" ALTER COLUMN "alt_names" SET NOT NULL;
