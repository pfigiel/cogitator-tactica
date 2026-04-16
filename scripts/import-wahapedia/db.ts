import { PrismaClient, WeaponType } from "@prisma/client";
import type { UnitWithFaction } from "./transform";

const prisma = new PrismaClient();

export const upsertAll = async (
  units: UnitWithFaction[],
  factions: Array<{ id: string; name: string }>,
): Promise<void> => {
  const weaponMap = new Map<
    string,
    { weapon: UnitWithFaction["shootingWeapons"][0]; wtype: WeaponType }
  >();
  for (const unit of units) {
    for (const w of unit.shootingWeapons) {
      weaponMap.set(w.id, { weapon: w, wtype: WeaponType.shooting });
    }
    for (const w of unit.meleeWeapons) {
      weaponMap.set(w.id, { weapon: w, wtype: WeaponType.melee });
    }
  }

  await prisma.$transaction(async (tx) => {
    // 0. Upsert factions first so units FK constraint is satisfied
    for (const faction of factions) {
      await tx.faction.upsert({
        where: { id: faction.id },
        update: { name: faction.name },
        create: { id: faction.id, name: faction.name },
      });
    }

    // 1. Upsert weapons
    for (const { weapon, wtype } of weaponMap.values()) {
      await tx.weapon.upsert({
        where: { id: weapon.id },
        update: {
          name: weapon.name,
          type: wtype,
          attacks: String(weapon.attacks),
          skill: weapon.skill,
          strength: weapon.strength,
          ap: weapon.ap,
          damage: String(weapon.damage),
          abilities: weapon.abilities as object[],
        },
        create: {
          id: weapon.id,
          name: weapon.name,
          type: wtype,
          attacks: String(weapon.attacks),
          skill: weapon.skill,
          strength: weapon.strength,
          ap: weapon.ap,
          damage: String(weapon.damage),
          abilities: weapon.abilities as object[],
        },
      });
    }

    // 2. Upsert units and replace their weapon associations
    for (const unit of units) {
      await tx.unit.upsert({
        where: { id: unit.id },
        update: {
          name: unit.name,
          factionId: unit.factionId,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        },
        create: {
          id: unit.id,
          name: unit.name,
          factionId: unit.factionId,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        },
      });

      await tx.unitWeapon.deleteMany({ where: { unitId: unit.id } });
      const allWeaponIds = [
        ...unit.shootingWeapons.map((w) => w.id),
        ...unit.meleeWeapons.map((w) => w.id),
      ];
      if (allWeaponIds.length > 0) {
        await tx.unitWeapon.createMany({
          data: allWeaponIds.map((weaponId) => ({
            unitId: unit.id,
            weaponId,
          })),
        });
      }
    }
  });

  await prisma.$disconnect();
};
