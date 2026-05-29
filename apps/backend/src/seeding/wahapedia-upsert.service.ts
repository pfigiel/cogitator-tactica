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
    const unitMap = new Map<string, UnitWithFaction>();
    const weaponMap = new Map<
      string,
      { weapon: UnitWithFaction["shootingWeapons"][0]; weaponType: WeaponType }
    >();
    for (const unit of units) {
      unitMap.set(unit.id, unit);
      for (const w of unit.shootingWeapons) {
        weaponMap.set(w.id, { weapon: w, weaponType: WeaponType.shooting });
      }
      for (const w of unit.meleeWeapons) {
        weaponMap.set(w.id, { weapon: w, weaponType: WeaponType.melee });
      }
    }

    const uniqueUnits = Array.from(unitMap.values());
    await this.prune();
    await this.seedFactions(factions);
    await this.seedWeapons(weaponMap);
    await this.seedUnits(uniqueUnits);
  }

  private async prune(): Promise<void> {
    try {
      await this.prisma.unitWeapon.deleteMany();
      await this.prisma.unit.deleteMany();
      await this.prisma.weapon.deleteMany();
      await this.prisma.faction.deleteMany();
    } catch (err) {
      console.error("[seed] FAILED at prune step — fix and re-run seed.", err);
      throw err;
    }
  }

  private async seedFactions(
    factions: Array<{ id: string; name: string }>,
  ): Promise<void> {
    try {
      await this.prisma.faction.createMany({
        data: factions.map((f) => ({ id: f.id, name: f.name })),
      });
    } catch (err) {
      console.error(
        "[seed] FAILED at factions step — fix and re-run seed.",
        err,
      );
      throw err;
    }
  }

  private async seedWeapons(
    weaponMap: Map<
      string,
      { weapon: UnitWithFaction["shootingWeapons"][0]; weaponType: WeaponType }
    >,
  ): Promise<void> {
    try {
      await this.prisma.weapon.createMany({
        data: Array.from(weaponMap.values()).map(({ weapon, weaponType }) => ({
          id: weapon.id,
          name: weapon.name,
          type: weaponType,
          attacks: String(weapon.attacks),
          skill: weapon.skill,
          strength: String(weapon.strength),
          ap: weapon.ap,
          damage: String(weapon.damage),
          abilities: weapon.abilities as object[],
        })),
      });
    } catch (err) {
      console.error(
        "[seed] FAILED at weapons step — fix and re-run seed.",
        err,
      );
      throw err;
    }
  }

  private async seedUnits(units: UnitWithFaction[]): Promise<void> {
    try {
      await this.prisma.unit.createMany({
        data: units.map((unit) => ({
          id: unit.id,
          name: unit.name,
          factionId: unit.factionId,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        })),
      });

      const unitWeaponData = units.flatMap((unit) => [
        ...unit.shootingWeapons.map((w) => ({
          unitId: unit.id,
          weaponId: w.id,
        })),
        ...unit.meleeWeapons.map((w) => ({ unitId: unit.id, weaponId: w.id })),
      ]);

      if (unitWeaponData.length > 0) {
        await this.prisma.unitWeapon.createMany({ data: unitWeaponData });
      }
    } catch (err) {
      console.error("[seed] FAILED at units step — fix and re-run seed.", err);
      throw err;
    }
  }
}
