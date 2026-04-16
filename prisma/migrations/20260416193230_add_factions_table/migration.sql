-- CreateTable
CREATE TABLE "factions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- Seed existing factions BEFORE adding FK (so existing unit rows don't violate it)
INSERT INTO "factions" ("id", "name") VALUES
    ('SM', 'Space Marines'),
    ('ORK', 'Orks');

-- Convert column type from enum to TEXT (enum values cast to text implicitly)
ALTER TABLE "units" ALTER COLUMN "faction_id" TYPE TEXT USING "faction_id"::TEXT;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_faction_id_fkey"
    FOREIGN KEY ("faction_id") REFERENCES "factions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old enum
DROP TYPE "Faction";
