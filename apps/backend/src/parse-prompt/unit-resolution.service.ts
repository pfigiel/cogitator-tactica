import { Injectable } from "@nestjs/common";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { UnitsService } from "../units/units.service";
import { FactionsService } from "../units/factions.service";
import type { UnitProfile } from "../common/types";
import type { ParsedContext } from "./types";

type UnitEmbeddingParams = {
  name: string;
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};

@Injectable()
export class UnitResolutionService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly unitsService: UnitsService,
    private readonly factionsService: FactionsService,
  ) {}

  async resolve(
    ctx: ParsedContext,
  ): Promise<{ attackerUnit: UnitProfile; defenderUnit: UnitProfile }> {
    const factions = await this.factionsService.getAllFactions();
    const getFactionName = (id: string | undefined): string | undefined =>
      id ? factions.find((f) => f.id === id)?.name : undefined;

    const weaponLabel = ctx.phase === "shooting" ? "ranged" : "melee";

    const attackerText = this.buildUnitEmbeddingText({
      name: ctx.attackerName,
      faction: getFactionName(ctx.attackerFactionId),
      ...(weaponLabel === "ranged" && ctx.attackerWeaponHints.length
        ? { rangedWeapons: ctx.attackerWeaponHints.map((h) => h.name) }
        : {}),
      ...(weaponLabel === "melee" && ctx.attackerWeaponHints.length
        ? { meleeWeapons: ctx.attackerWeaponHints.map((h) => h.name) }
        : {}),
    });

    const defenderText = this.buildUnitEmbeddingText({
      name: ctx.defenderName,
      faction: getFactionName(ctx.defenderFactionId),
      ...(weaponLabel === "ranged" && ctx.defenderWeaponHints.length
        ? { rangedWeapons: ctx.defenderWeaponHints.map((h) => h.name) }
        : {}),
      ...(weaponLabel === "melee" && ctx.defenderWeaponHints.length
        ? { meleeWeapons: ctx.defenderWeaponHints.map((h) => h.name) }
        : {}),
    });

    const [attackerEmbedding, defenderEmbedding] =
      await this.embeddingsService.embedTexts([attackerText, defenderText]);

    const [attackerMatches, defenderMatches] = await Promise.all([
      this.unitsService.searchUnitsByEmbedding(
        attackerEmbedding,
        5,
        ctx.attackerFactionId,
      ),
      this.unitsService.searchUnitsByEmbedding(
        defenderEmbedding,
        5,
        ctx.defenderFactionId,
      ),
    ]);

    const attackerBest = this.unitsService.searchUnitsByFuzzyNameMatch(
      ctx.attackerName,
      attackerMatches,
    );
    const defenderBest = this.unitsService.searchUnitsByFuzzyNameMatch(
      ctx.defenderName,
      defenderMatches,
    );

    const [attackerUnit, defenderUnit] = await Promise.all([
      attackerBest ? this.unitsService.getUnit(attackerBest.id) : null,
      defenderBest ? this.unitsService.getUnit(defenderBest.id) : null,
    ]);

    if (!attackerUnit || !defenderUnit) {
      throw new Error(
        `Could not resolve units: attacker="${ctx.attackerName}", defender="${ctx.defenderName}"`,
      );
    }

    return { attackerUnit, defenderUnit };
  }

  private buildUnitEmbeddingText({
    name,
    faction,
    meleeWeapons,
    rangedWeapons,
  }: UnitEmbeddingParams): string {
    const lines = [`Unit: ${name}`];
    if (faction) lines.push(`Faction: ${faction}`);
    if (meleeWeapons?.length)
      lines.push(`Melee weapons: ${meleeWeapons.join(", ")}`);
    if (rangedWeapons?.length)
      lines.push(`Ranged weapons: ${rangedWeapons.join(", ")}`);
    return lines.join("\n");
  }
}
