-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Faction" AS ENUM ('SM', 'ORK');

-- CreateEnum
CREATE TYPE "WeaponType" AS ENUM ('shooting', 'melee');

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faction_id" "Faction" NOT NULL,
    "toughness" INTEGER NOT NULL,
    "save" INTEGER NOT NULL,
    "invuln" INTEGER,
    "wounds" INTEGER NOT NULL,
    "keywords" TEXT[],
    "embedding" vector(1536),

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WeaponType" NOT NULL,
    "attacks" TEXT NOT NULL,
    "skill" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "ap" INTEGER NOT NULL,
    "damage" TEXT NOT NULL,
    "abilities" JSONB NOT NULL,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_weapons" (
    "unit_id" TEXT NOT NULL,
    "weapon_id" TEXT NOT NULL,

    CONSTRAINT "unit_weapons_pkey" PRIMARY KEY ("unit_id","weapon_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weapons_name_type_attacks_skill_strength_ap_damage_key" ON "weapons"("name", "type", "attacks", "skill", "strength", "ap", "damage");

-- AddForeignKey
ALTER TABLE "unit_weapons" ADD CONSTRAINT "unit_weapons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_weapons" ADD CONSTRAINT "unit_weapons_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
