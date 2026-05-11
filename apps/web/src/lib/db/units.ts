import Fuse from "fuse.js";
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

type UnitSearchResult = { id: string; name: string; altNames: string[] };

export const searchUnitsByEmbedding = async (
  embedding: number[],
  limit = 5,
  factionId?: string,
): Promise<UnitSearchResult[]> => {
  const vectorLiteral = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
  const factionFilter = factionId
    ? Prisma.sql`AND faction_id = ${factionId}`
    : Prisma.empty;
  return prisma.$queryRaw<UnitSearchResult[]>`
    SELECT id, name, alt_names AS "altNames"
    FROM units
    WHERE embedding IS NOT NULL ${factionFilter}
    ORDER BY embedding <=> ${vectorLiteral}
    LIMIT ${limit}
  `;
};

export const searchUnitsByFuzzyNameMatch = (
  unitName: string,
  candidates: UnitSearchResult[],
): UnitSearchResult | null => {
  if (candidates.length === 0) return null;

  type Doc = { unitId: string; term: string };
  const docs: Doc[] = candidates.flatMap((u) => [
    { unitId: u.id, term: u.name },
    ...u.altNames.map((alt) => ({ unitId: u.id, term: alt })),
  ]);

  const fuse = new Fuse(docs, {
    keys: ["term"],
    includeScore: true,
    threshold: 1.0,
  });

  const results = fuse.search(unitName);
  if (results.length === 0) return candidates[0];

  const best = results.reduce((a, b) =>
    (a.score ?? 1) <= (b.score ?? 1) ? a : b,
  );

  return candidates.find((u) => u.id === best.item.unitId) ?? candidates[0];
};
