import { Injectable } from "@nestjs/common";
import { WeaponType } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { UnitWithFaction } from "./wahapedia-parser.service";

@Injectable()
export class WahapediaUpsertService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertAll(
    units: UnitWithFaction[],
    factions: Array<{ id: string; name: string }>,
  ): Promise<void> {
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

    await this.prisma.$transaction(
      async (tx) => {
        for (const faction of factions) {
          await tx.faction.upsert({
            where: { id: faction.id },
            update: { name: faction.name },
            create: { id: faction.id, name: faction.name },
          });
        }

        for (const { weapon, wtype } of weaponMap.values()) {
          await tx.weapon.upsert({
            where: { id: weapon.id },
            update: {
              name: weapon.name,
              type: wtype,
              attacks: String(weapon.attacks),
              skill: weapon.skill,
              strength: String(weapon.strength),
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
              strength: String(weapon.strength),
              ap: weapon.ap,
              damage: String(weapon.damage),
              abilities: weapon.abilities as object[],
            },
          });
        }

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
      },
      { timeout: 1_800_000 },
    );
  }
}
