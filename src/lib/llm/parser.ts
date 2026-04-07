import Anthropic from "@anthropic-ai/sdk";
import { CombatFormState, SelectedWeapon, DEFAULT_ATTACKER_CONTEXT } from "@/lib/calculator/types";
import { UNIT_LIST, UNITS } from "@/data/units";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const UNIT_DESCRIPTIONS = UNIT_LIST
  .map((u) => {
    const shooting = u.shootingWeapons
      .map((w) => `      - "${w.name}" (A${w.attacks} S${w.strength} AP-${w.ap} D${w.damage})`)
      .join("\n");
    const melee = u.meleeWeapons
      .map((w) => `      - "${w.name}" (A${w.attacks} S${w.strength} AP-${w.ap} D${w.damage})`)
      .join("\n");
    return [
      `  - id: "${u.id}", name: "${u.name}"`,
      `    Shooting weapons:\n${shooting || "      (none)"}`,
      `    Melee weapons:\n${melee || "      (none)"}`,
    ].join("\n");
  })
  .join("\n");

const SYSTEM_PROMPT = `You are a Warhammer 40,000 combat assistant. Parse a natural language combat description into structured JSON.

Available units and their weapons:
${UNIT_DESCRIPTIONS}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "phase": "shooting" | "melee",
  "attackerUnitId": string,
  "attackerCount": number,
  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }],
  "defenderUnitId": string,
  "defenderCount": number,
  "defenderInCover": boolean,
  "defenderWeapons": [{ "weaponName": string, "modelCount": number | null }],
  "firstFighter": "attacker" | "defender"
}

Rules:
- "phase" defaults to "shooting" if not specified
- "firstFighter" defaults to "attacker" if not specified or ambiguous
- "defenderInCover" is true only if cover is explicitly mentioned
- "attackerWeapons": list the weapons the attacker uses, in the order mentioned. Use weapon names exactly as listed above. If no weapons are specified, default to the first shooting weapon (shooting phase) or first melee weapon (melee phase). "modelCount" is null if all models use the weapon, or a specific number if only some do (e.g. 2 grenade launchers in a 10-man squad).
- "defenderWeapons": same rules, but always from the defender's melee weapons (used for the counterattack in melee). If phase is shooting, still include the defender's default melee weapon.
- If a unit name is ambiguous, pick the closest match from the available list
- attackerCount and defenderCount must be positive integers`;

export async function parsePrompt(prompt: string): Promise<CombatFormState> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${text}`);
  }

  // Validate required fields
  if (!parsed.phase || !parsed.attackerUnitId || !parsed.defenderUnitId) {
    throw new Error(`LLM response missing required fields: ${text}`);
  }

  const phase = parsed.phase ?? "shooting";
  const attackerUnitId: string = parsed.attackerUnitId;
  const defenderUnitId: string = parsed.defenderUnitId;

  const attackerUnit = UNITS[attackerUnitId];
  const defenderUnit = UNITS[defenderUnitId];

  // Build default weapons as fallback
  const defaultAttackerPool =
    attackerUnit
      ? phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons
      : [];
  const defaultDefenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];

  function parseWeaponList(
    raw: unknown,
    fallbackPool: typeof defaultAttackerPool
  ): SelectedWeapon[] {
    if (Array.isArray(raw) && raw.length > 0) {
      const result: SelectedWeapon[] = raw
        .filter((item) => item && typeof item.weaponName === "string")
        .map((item) => ({
          weaponName: item.weaponName as string,
          modelCount:
            item.modelCount != null && Number.isFinite(Number(item.modelCount))
              ? Math.max(1, Number(item.modelCount))
              : undefined,
        }));
      if (result.length > 0) return result;
    }
    return fallbackPool.length > 0 ? [{ weaponName: fallbackPool[0].name }] : [];
  }

  const attackerWeapons = parseWeaponList(parsed.attackerWeapons, defaultAttackerPool);
  const defenderWeapons = parseWeaponList(parsed.defenderWeapons, defaultDefenderPool);

  return {
    phase,
    attackerUnitId,
    attackerCount: Math.max(1, Number(parsed.attackerCount) || 1),
    attackerWeapons,
    attackerContext: DEFAULT_ATTACKER_CONTEXT,
    defenderUnitId,
    defenderCount: Math.max(1, Number(parsed.defenderCount) || 1),
    defenderInCover: Boolean(parsed.defenderInCover),
    defenderWeapons,
    defenderContext: DEFAULT_ATTACKER_CONTEXT,
    firstFighter: parsed.firstFighter ?? "attacker",
  };
}
