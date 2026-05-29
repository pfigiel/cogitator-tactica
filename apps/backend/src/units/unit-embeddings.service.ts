import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { DbUnitWithWeapons } from "../database/types";

const BATCH_SIZE = 128;

export type UnitEmbeddingParams = {
  name: string;
  altNames?: string[];
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};

@Injectable()
export class UnitEmbeddingsService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly prisma: PrismaService,
  ) {}

  buildEmbeddingText(params: UnitEmbeddingParams): string {
    const lines = [`Unit: ${params.name}`];
    if (params.altNames?.length)
      lines.push(`Alternative names: ${params.altNames.join(", ")}`);
    if (params.faction) lines.push(`Faction: ${params.faction}`);
    if (params.meleeWeapons?.length)
      lines.push(`Melee weapons: ${params.meleeWeapons.join(", ")}`);
    if (params.rangedWeapons?.length)
      lines.push(`Ranged weapons: ${params.rangedWeapons.join(", ")}`);
    return lines.join("\n");
  }

  async generateAndStore(
    units: DbUnitWithWeapons[],
    factionNameById: Map<string, string>,
  ): Promise<void> {
    for (let i = 0; i < units.length; i += BATCH_SIZE) {
      const batch = units.slice(i, i + BATCH_SIZE);
      const texts = batch.map((u) =>
        this.buildEmbeddingText({
          name: u.name,
          altNames: u.altNames,
          faction: factionNameById.get(u.factionId),
          meleeWeapons: u.unitWeapons
            .filter((uw) => uw.weapon.type === "melee")
            .map((uw) => uw.weapon.name),
          rangedWeapons: u.unitWeapons
            .filter((uw) => uw.weapon.type === "shooting")
            .map((uw) => uw.weapon.name),
        }),
      );

      const embeddingVectors = await this.embeddings.embedTexts(texts);

      for (let j = 0; j < batch.length; j++) {
        const vectorLiteral = Prisma.raw(
          `'[${embeddingVectors[j].join(",")}]'::vector`,
        );
        await this.prisma.$executeRaw`
          UPDATE units SET embedding = ${vectorLiteral} WHERE id = ${batch[j].id}
        `;
      }
    }
  }
}
