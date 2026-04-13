import { prisma } from ".";
import { toUnitProfile } from "./types";
import type { UnitProfile } from "@/lib/calculator/types";

export const listUnits = async (): Promise<Array<{ id: string; name: string }>> =>
  prisma.unit.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

export const getUnit = async (id: string): Promise<UnitProfile | null> => {
  const db = await prisma.unit.findUnique({
    where: { id },
    include: { unitWeapons: { include: { weapon: true } } },
  });
  return db ? toUnitProfile(db) : null;
};
