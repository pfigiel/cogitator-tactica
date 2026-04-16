import { Prisma } from "@prisma/client";
import { prisma } from ".";
import { toUnitProfile } from "./types";
import type { UnitProfile } from "@/lib/calculator/types";

export const listUnits = async (): Promise<
  Array<{ id: string; name: string }>
> =>
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

export const searchUnitsByEmbedding = async (
  embedding: number[],
  limit = 1,
  factionId?: string,
): Promise<Array<{ id: string; name: string }>> => {
  const vectorLiteral = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
  const factionFilter = factionId
    ? Prisma.sql`AND faction_id = ${factionId}`
    : Prisma.empty;
  return prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM units
    WHERE embedding IS NOT NULL ${factionFilter}
    ORDER BY embedding <=> ${vectorLiteral}
    LIMIT ${limit}
  `;
};
