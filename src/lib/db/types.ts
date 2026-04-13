import { Prisma } from "@prisma/client";
import type {
  UnitProfile,
  WeaponProfile,
  DiceExpression,
  WeaponAbility,
} from "@/lib/calculator/types";

export type DbUnit = Prisma.UnitGetPayload<Record<string, never>>;
export type DbWeapon = Prisma.WeaponGetPayload<Record<string, never>>;
export type DbUnitWithWeapons = Prisma.UnitGetPayload<{
  include: { unitWeapons: { include: { weapon: true } } };
}>;

const parseDiceExpr = (s: string): DiceExpression => {
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};

export const toWeaponProfile = (db: DbWeapon): WeaponProfile => ({
  id: db.id,
  name: db.name,
  attacks: parseDiceExpr(db.attacks),
  skill: db.skill,
  strength: db.strength,
  ap: db.ap,
  damage: parseDiceExpr(db.damage),
  abilities: db.abilities as WeaponAbility[],
});

export const toUnitProfile = (db: DbUnitWithWeapons): UnitProfile => ({
  id: db.id,
  name: db.name,
  toughness: db.toughness,
  save: db.save,
  ...(db.invuln !== null && { invuln: db.invuln }),
  wounds: db.wounds,
  keywords: db.keywords,
  shootingWeapons: db.unitWeapons
    .filter((uw) => uw.weapon.type === "shooting")
    .map((uw) => toWeaponProfile(uw.weapon)),
  meleeWeapons: db.unitWeapons
    .filter((uw) => uw.weapon.type === "melee")
    .map((uw) => toWeaponProfile(uw.weapon)),
});
