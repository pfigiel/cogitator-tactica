import { Injectable } from "@nestjs/common";
import Fuse from "fuse.js";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { DbUnitWithWeapons, DbWeapon } from "../database/types";
import type {
  UnitProfile,
  WeaponProfile,
  DiceExpression,
  WeaponAbility,
} from "../common/types";

type UnitSearchResult = { id: string; name: string; altNames: string[] };

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  listUnits(): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.unit.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async getUnit(id: string): Promise<UnitProfile | null> {
    return this.toUnitProfile(
      await this.prisma.unit.findUnique({
        where: { id },
        include: { unitWeapons: { include: { weapon: true } } },
      }),
    );
  }

  searchUnitsByEmbedding(
    embedding: number[],
    limit = 5,
    factionId?: string,
  ): Promise<UnitSearchResult[]> {
    const vectorLiteral = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
    const factionFilter = factionId
      ? Prisma.sql`AND faction_id = ${factionId}`
      : Prisma.empty;
    return this.prisma.$queryRaw<UnitSearchResult[]>`
      SELECT id, name, alt_names AS "altNames"
      FROM units
      WHERE embedding IS NOT NULL ${factionFilter}
      ORDER BY embedding <=> ${vectorLiteral}
      LIMIT ${limit}
    `;
  }

  searchUnitsByFuzzyNameMatch(
    unitName: string,
    candidates: UnitSearchResult[],
  ): UnitSearchResult | null {
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
  }

  // TODO: Add validation
  private parseDiceExpr(s: string): DiceExpression {
    const n = Number(s);
    return Number.isFinite(n) ? n : (s as DiceExpression);
  }

  private toWeaponProfile(db: DbWeapon): WeaponProfile {
    return {
      id: db.id,
      name: db.name,
      attacks: this.parseDiceExpr(db.attacks),
      skill: db.skill,
      strength: this.parseDiceExpr(db.strength),
      ap: db.ap,
      damage: this.parseDiceExpr(db.damage),
      abilities: db.abilities as WeaponAbility[],
    };
  }

  private toUnitProfile(db: DbUnitWithWeapons | null): UnitProfile | null {
    return !db
      ? null
      : {
          id: db.id,
          name: db.name,
          toughness: db.toughness,
          save: db.save,
          ...(db.invuln !== null && { invuln: db.invuln }),
          wounds: db.wounds,
          keywords: db.keywords,
          shootingWeapons: db.unitWeapons
            .filter((uw) => uw.weapon.type === "shooting")
            .map((uw) => this.toWeaponProfile(uw.weapon)),
          meleeWeapons: db.unitWeapons
            .filter((uw) => uw.weapon.type === "melee")
            .map((uw) => this.toWeaponProfile(uw.weapon)),
        };
  }
}
