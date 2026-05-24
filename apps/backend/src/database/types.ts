import { Prisma } from "@prisma/client";

export type DbUnit = Prisma.UnitGetPayload<Record<string, never>>;
export type DbWeapon = Prisma.WeaponGetPayload<Record<string, never>>;
export type DbUnitWithWeapons = Prisma.UnitGetPayload<{
  include: { unitWeapons: { include: { weapon: true } } };
}>;
