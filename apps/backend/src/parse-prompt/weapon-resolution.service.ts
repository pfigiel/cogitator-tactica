import { Injectable } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import type {
  UnitProfile,
  WeaponProfile,
  SelectedWeapon,
  CombatPhase,
} from "../common/types";
import type { ParsedContext, WeaponResolution } from "./types";

@Injectable()
export class WeaponResolutionService {
  constructor(private readonly llmService: LlmService) {}

  async resolve(
    ctx: ParsedContext,
    attackerUnit: UnitProfile,
    defenderUnit: UnitProfile,
    phase: CombatPhase,
  ): Promise<WeaponResolution> {
    const system = this.buildWeaponSystemPrompt(
      attackerUnit,
      defenderUnit,
      phase,
    );
    const message = [
      ctx.attackerWeaponHints.length > 0
        ? `Attacker weapons mentioned: ${ctx.attackerWeaponHints
            .map((h) => (h.count != null ? `${h.name} (${h.count})` : h.name))
            .join(", ")}`
        : "No specific attacker weapons mentioned.",
      ctx.defenderWeaponHints.length > 0
        ? `Defender weapons mentioned: ${ctx.defenderWeaponHints
            .map((h) => (h.count != null ? `${h.name} (${h.count})` : h.name))
            .join(", ")}`
        : "No specific defender weapons mentioned.",
    ].join("\n");

    const rawText = await this.llmService.createMessage({
      model: "haiku",
      maxTokens: 256,
      system,
      cacheControl: true,
      message,
    });

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      throw new Error(`No JSON object found in LLM response: ${rawText}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(`LLM returned invalid JSON for weapons: ${jsonMatch[0]}`);
    }

    const attackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const defenderPool = defenderUnit.meleeWeapons;

    return {
      attackerWeapons: this.parseWeaponList(
        parsed.attackerWeapons,
        attackerPool,
        attackerPool[0]?.id,
      ),
      defenderWeapons:
        phase === "melee"
          ? this.parseWeaponList(
              parsed.defenderWeapons,
              defenderPool,
              defenderPool[0]?.id,
            )
          : defenderPool.length > 0
            ? [{ weaponId: defenderPool[0].id }]
            : [],
    };
  }

  private buildWeaponSystemPrompt(
    attackerUnit: UnitProfile,
    defenderUnit: UnitProfile,
    phase: CombatPhase,
  ): string {
    const attackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const attackerNames = attackerPool.map((w) => `  - "${w.name}"`).join("\n");

    const schemaFields =
      phase === "melee"
        ? `  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }],\n  "defenderWeapons": [{ "weaponName": string, "modelCount": number | null }]`
        : `  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }]`;

    let defenderSection = "";
    if (phase === "melee") {
      const defenderNames = defenderUnit.meleeWeapons
        .map((w) => `  - "${w.name}"`)
        .join("\n");
      defenderSection = `\n\nDefender melee weapons:\n${defenderNames || "  (none)"}`;
    }

    return `You are a Warhammer 40,000 combat assistant. Identify which weapons are used in this combat.

Attacker weapons:
${attackerNames || "  (none)"}${defenderSection}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
${schemaFields}
}

Rules:
- Use weapon names exactly as listed above
- List weapons in the order mentioned by the user
- "modelCount" is null if all models use the weapon, or a specific number if only some do (e.g. 2 of a specific weapon in a 10-model squad)
- If attacker weapons are not clearly specified, default to the first weapon in the list`;
  }

  private normalizeWeaponName(s: string): string {
    return s
      .toLowerCase()
      .replace(/[''`']/g, "'")
      .trim();
  }

  private parseWeaponList(
    raw: unknown,
    pool: WeaponProfile[],
    fallbackId: string | undefined,
  ): SelectedWeapon[] {
    if (Array.isArray(raw) && raw.length > 0) {
      const result: SelectedWeapon[] = raw
        .filter((item) => item && typeof item.weaponName === "string")
        .flatMap((item) => {
          const match = pool.find(
            (w) =>
              this.normalizeWeaponName(w.name) ===
              this.normalizeWeaponName(item.weaponName as string),
          );
          if (!match) return [];
          const modelCount =
            item.modelCount != null && Number.isFinite(Number(item.modelCount))
              ? Math.max(1, Number(item.modelCount))
              : undefined;
          return [{ weaponId: match.id, modelCount }];
        });
      if (result.length > 0) return result;
    }
    return fallbackId ? [{ weaponId: fallbackId }] : [];
  }
}
