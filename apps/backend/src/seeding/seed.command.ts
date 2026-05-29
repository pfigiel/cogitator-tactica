import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { PrismaService } from "../database/prisma.service";
import { UnitEmbeddingsService } from "../units/unit-embeddings.service";
import { WahapediaAltNamesService } from "./wahapedia-alt-names.service";
import { WahapediaParserService } from "./wahapedia-parser.service";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";

@Injectable()
@Command({
  name: "seed",
  description: "Seed DB with Wahapedia data and generate embeddings",
})
export class SeedCommand extends CommandRunner {
  constructor(
    private readonly parser: WahapediaParserService,
    private readonly upsert: WahapediaUpsertService,
    private readonly altNames: WahapediaAltNamesService,
    private readonly unitEmbeddings: UnitEmbeddingsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(): Promise<void> {
    try {
      const { units, factions, warnings } =
        await this.parser.parseAndTransform();

      for (const w of warnings) {
        console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
      }

      console.log(
        `Upserting ${units.length} units across ${factions.length} factions...`,
      );
      await this.upsert.upsertAll(units, factions);
      console.log("Units upserted.");

      const factionNameById = new Map(factions.map((f) => [f.id, f.name]));
      const unitsByFaction = new Map<string, { id: string; name: string }[]>();
      for (const unit of units) {
        const list = unitsByFaction.get(unit.factionId) ?? [];
        list.push({ id: unit.id, name: unit.name });
        unitsByFaction.set(unit.factionId, list);
      }

      await this.altNames.generateAndUpdate(unitsByFaction, factionNameById);
      console.log("Alt names generated.");

      const dbUnits = await this.prisma.unit.findMany({
        include: { unitWeapons: { include: { weapon: true } } },
      });
      console.log(`Generating embeddings for ${dbUnits.length} units...`);
      await this.unitEmbeddings.generateAndStore(dbUnits, factionNameById);
      console.log("Embeddings generated. Done.");
    } catch (err) {
      console.error(`[ERROR] Seed failed: ${err}`);
      throw err;
    }
  }
}
