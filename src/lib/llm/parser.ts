import Anthropic from "@anthropic-ai/sdk";
import {
  UnitProfile,
  CombatFormState,
  SelectedWeapon,
  DEFAULT_ATTACKER_CONTEXT,
} from "@/lib/calculator/types";
import { UNIT_LIST, UNITS } from "@/data/units";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// ─── Call 1: Unit and context resolution ─────────────────────────────────────

const UNIT_NAME_LIST = UNIT_LIST.map(
  (u) => `  - id: "${u.id}", name: "${u.name}"`,
).join("\n");

const SYSTEM_PROMPT_UNITS = `You are a Warhammer 40,000 combat assistant. Parse a natural language combat description into structured JSON.

Available units:
${UNIT_NAME_LIST}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "phase": "shooting" | "melee",
  "attackerUnitId": string,
  "attackerCount": number,
  "defenderUnitId": string,
  "defenderCount": number,
  "defenderInCover": boolean,
  "firstFighter": "attacker" | "defender",
  "weaponsExplicit": boolean
}

Rules:
- "phase" defaults to "shooting" if not specified
- "firstFighter" defaults to "attacker" if not specified or ambiguous
- "defenderInCover" is true only if cover is explicitly mentioned
- "weaponsExplicit" is true only if the user's prompt explicitly names specific weapon(s)
- attackerCount and defenderCount must be positive integers
- If a unit name is ambiguous, pick the closest match from the available list`;

interface UnitResolution {
  phase: "shooting" | "melee";
  attackerUnitId: string;
  attackerCount: number;
  defenderUnitId: string;
  defenderCount: number;
  defenderInCover: boolean;
  firstFighter: "attacker" | "defender";
  weaponsExplicit: boolean;
}

const resolveUnitsAndContext = async (prompt: string): Promise<UnitResolution> => {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: SYSTEM_PROMPT_UNITS,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)[0];

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON object found in LLM response: ${rawText}`);
  const text = jsonMatch[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${text}`);
  }

  if (!parsed.phase || !parsed.attackerUnitId || !parsed.defenderUnitId) {
    throw new Error(`LLM response missing required fields: ${text}`);
  }

  return {
    phase: parsed.phase,
    attackerUnitId: parsed.attackerUnitId,
    attackerCount: Math.max(1, Number(parsed.attackerCount) || 1),
    defenderUnitId: parsed.defenderUnitId,
    defenderCount: Math.max(1, Number(parsed.defenderCount) || 1),
    defenderInCover: Boolean(parsed.defenderInCover),
    firstFighter: parsed.firstFighter ?? "attacker",
    weaponsExplicit: Boolean(parsed.weaponsExplicit),
  };
};

// ─── Call 2: Weapon resolution (conditional) ─────────────────────────────────

const buildWeaponSystemPrompt = (
  attackerUnit: UnitProfile,
  defenderUnit: UnitProfile | undefined,
  phase: "shooting" | "melee",
): string => {
  const attackerPool =
    phase === "shooting" ? attackerUnit.shootingWeapons : attackerUnit.meleeWeapons;
  const attackerNames = attackerPool.map((w) => `  - "${w.name}"`).join("\n");

  const schemaFields =
    phase === "melee"
      ? `  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }],\n  "defenderWeapons": [{ "weaponName": string, "modelCount": number | null }]`
      : `  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }]`;

  let defenderSection = "";
  if (phase === "melee" && defenderUnit) {
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
};

/**
 * Resolved weapon selections from call 2.
 * defenderWeapons is always populated: from the LLM in melee phase,
 * or from a hardcoded default (first melee weapon) in shooting phase.
 */
interface WeaponResolution {
  attackerWeapons: SelectedWeapon[];
  defenderWeapons: SelectedWeapon[];
}

// Fallback is resolved to a name by the caller (not a pool), decoupling
// this function from phase-specific pool selection logic.
const parseWeaponList = (
  raw: unknown,
  fallbackName: string | undefined,
): SelectedWeapon[] => {
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
  return fallbackName ? [{ weaponName: fallbackName }] : [];
};

const resolveWeapons = async (
  prompt: string,
  attackerUnit: UnitProfile,
  defenderUnit: UnitProfile | undefined,
  phase: "shooting" | "melee",
): Promise<WeaponResolution> => {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: buildWeaponSystemPrompt(attackerUnit, defenderUnit, phase),
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)[0];

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON object found in LLM response: ${rawText}`);
  const text = jsonMatch[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned invalid JSON for weapons: ${text}`);
  }

  const attackerPool =
    phase === "shooting" ? attackerUnit.shootingWeapons : attackerUnit.meleeWeapons;
  const defenderPool = defenderUnit?.meleeWeapons ?? [];

  return {
    attackerWeapons: parseWeaponList(parsed.attackerWeapons, attackerPool[0]?.name),
    defenderWeapons:
      phase === "melee"
        ? parseWeaponList(parsed.defenderWeapons, defenderPool[0]?.name)
        : defenderPool.length > 0
          ? [{ weaponName: defenderPool[0].name }]
          : [],
  };
};

const UNIT_DESCRIPTIONS = UNIT_LIST.map((u) => {
  const shooting = u.shootingWeapons
    .map(
      (w) =>
        `      - "${w.name}" (A${w.attacks} S${w.strength} AP-${w.ap} D${w.damage})`,
    )
    .join("\n");
  const melee = u.meleeWeapons
    .map(
      (w) =>
        `      - "${w.name}" (A${w.attacks} S${w.strength} AP-${w.ap} D${w.damage})`,
    )
    .join("\n");
  return [
    `  - id: "${u.id}", name: "${u.name}"`,
    `    Shooting weapons:\n${shooting || "      (none)"}`,
    `    Melee weapons:\n${melee || "      (none)"}`,
  ].join("\n");
}).join("\n");

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

export const parsePrompt = async (prompt: string): Promise<CombatFormState> => {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)[0]
    .split("\n")
    .slice(1, -1)
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
  const defaultAttackerPool = attackerUnit
    ? phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons
    : [];
  const defaultDefenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];

  const parseWeaponList = (
    raw: unknown,
    fallbackPool: typeof defaultAttackerPool,
  ): SelectedWeapon[] => {
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
    return fallbackPool.length > 0
      ? [{ weaponName: fallbackPool[0].name }]
      : [];
  };

  const attackerWeapons = parseWeaponList(
    parsed.attackerWeapons,
    defaultAttackerPool,
  );
  const defenderWeapons = parseWeaponList(
    parsed.defenderWeapons,
    defaultDefenderPool,
  );

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
};
