ALTER TABLE "units" DROP COLUMN "embedding";
ALTER TABLE "units" ADD COLUMN "embedding" vector(1024);
