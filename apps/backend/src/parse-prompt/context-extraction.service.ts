import { Injectable } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { FactionsService, FactionRecord } from "../units/factions.service";
import type { ParsedContext, WeaponHint } from "./types";

@Injectable()
export class ContextExtractionService {
  constructor(
    private readonly llmService: LlmService,
    private readonly factionsService: FactionsService,
  ) {}

  async extract(prompt: string): Promise<ParsedContext> {
    const factions = await this.factionsService.getAllFactions();
    const system = this.buildSystemPrompt(factions);
    const rawText = await this.llmService.createMessage({
      model: "haiku",
      maxTokens: 256,
      system,
      message: prompt,
    });
    return this.parseContextFromJson(rawText);
  }

  private buildSystemPrompt(factions: FactionRecord[]): string {
    const factionsContext = factions
      .map((f) => `- ${f.name} (id: "${f.id}")`)
      .join("\n");

    return `You are a Warhammer 40,000 combat assistant. Extract combat parameters from the user's prompt.

Return a JSON object with:
- "attackerName": string — the attacker unit name as mentioned by the user
- "defenderName": string — the defender unit name as mentioned by the user
- "attackerCount": number — number of attacking models (default 1)
- "defenderCount": number — number of defending models (default 1)
- "phase": "shooting" | "melee" (default "shooting")
- "defenderInCover": boolean (default false)
- "firstFighter": "attacker" | "defender" (default "attacker")
- "attackerWeaponHints": array of { "name": string, "count": number | null } — weapons mentioned for the attacker; set "count" ONLY when a number is directly and explicitly stated in the prompt for that specific weapon; otherwise omit or set null. Never guess, infer, or distribute the total model count.
- "defenderWeaponHints": array of { "name": string, "count": number | null } — same rules as attackerWeaponHints
- "attackerFactionId": string | null — faction id ONLY if the attacker's faction is explicitly named in the prompt; null otherwise
- "defenderFactionId": string | null — faction id ONLY if the defender's faction is explicitly named in the prompt; null otherwise

Known factions:
${factionsContext}

IMPORTANT: Only return a faction id when you are certain the user explicitly stated that faction. If the faction is implied, guessed, or not mentioned at all, return null.

Return only a JSON object, no other text.`;
  }

  private parseWeaponHints(raw: unknown): WeaponHint[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== "object" || typeof item.name !== "string")
        return [];
      const hint: WeaponHint = { name: item.name };
      if (item.count !== null && Number.isFinite(Number(item.count)))
        hint.count = Math.max(1, Number(item.count));
      return [hint];
    });
  }

  private parseContextFromJson(text: string): ParsedContext {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON object found in: ${text}`);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      throw new Error(`Invalid JSON: ${text}`);
    }

    if (!parsed.attackerName || !parsed.defenderName) {
      throw new Error(
        `Missing required fields attackerName/defenderName: ${text}`,
      );
    }

    return {
      attackerName: String(parsed.attackerName),
      defenderName: String(parsed.defenderName),
      attackerCount: Math.max(1, Number(parsed.attackerCount) || 1),
      defenderCount: Math.max(1, Number(parsed.defenderCount) || 1),
      phase: parsed.phase === "melee" ? "melee" : "shooting",
      defenderInCover: Boolean(parsed.defenderInCover),
      firstFighter:
        parsed.firstFighter === "defender" ? "defender" : "attacker",
      attackerWeaponHints: this.parseWeaponHints(parsed.attackerWeaponHints),
      defenderWeaponHints: this.parseWeaponHints(parsed.defenderWeaponHints),
      attackerFactionId:
        typeof parsed.attackerFactionId === "string"
          ? parsed.attackerFactionId
          : undefined,
      defenderFactionId:
        typeof parsed.defenderFactionId === "string"
          ? parsed.defenderFactionId
          : undefined,
    };
  }
}
