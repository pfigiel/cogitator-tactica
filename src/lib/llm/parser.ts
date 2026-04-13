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

const resolveUnitsAndContext = async (
  prompt: string,
): Promise<UnitResolution> => {
  console.log("[parser] call1 input:", prompt);
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    cache_control: { type: "ephemeral" },
    system: SYSTEM_PROMPT_UNITS,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)[0];

  console.log("[parser] call1 raw output:", rawText);

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error(`No JSON object found in LLM response: ${rawText}`);
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

  const result = {
    phase: parsed.phase,
    attackerUnitId: parsed.attackerUnitId,
    attackerCount: Math.max(1, Number(parsed.attackerCount) || 1),
    defenderUnitId: parsed.defenderUnitId,
    defenderCount: Math.max(1, Number(parsed.defenderCount) || 1),
    defenderInCover: Boolean(parsed.defenderInCover),
    firstFighter: parsed.firstFighter ?? "attacker",
    weaponsExplicit: Boolean(parsed.weaponsExplicit),
  };
  console.log("[parser] call1 parsed:", result);
  return result;
};

// ─── Call 2: Weapon resolution (conditional) ─────────────────────────────────

const buildWeaponSystemPrompt = (
  attackerUnit: UnitProfile,
  defenderUnit: UnitProfile | undefined,
  phase: "shooting" | "melee",
): string => {
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
  console.log("[parser] call2 input:", prompt);
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    cache_control: { type: "ephemeral" },
    system: buildWeaponSystemPrompt(attackerUnit, defenderUnit, phase),
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)[0];

  console.log("[parser] call2 raw output:", rawText);

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error(`No JSON object found in LLM response: ${rawText}`);
  const text = jsonMatch[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned invalid JSON for weapons: ${text}`);
  }

  const attackerPool =
    phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons;
  const defenderPool = defenderUnit?.meleeWeapons ?? [];

  const weaponResult = {
    attackerWeapons: parseWeaponList(
      parsed.attackerWeapons,
      attackerPool[0]?.name,
    ),
    defenderWeapons:
      phase === "melee"
        ? parseWeaponList(parsed.defenderWeapons, defenderPool[0]?.name)
        : defenderPool.length > 0
          ? [{ weaponName: defenderPool[0].name }]
          : [],
  };
  console.log("[parser] call2 parsed:", weaponResult);
  return weaponResult;
};

export const parsePrompt = async (prompt: string): Promise<CombatFormState> => {
  const unitResolution = await resolveUnitsAndContext(prompt);

  const { phase, attackerUnitId, defenderUnitId } = unitResolution;
  const attackerUnit = UNITS[attackerUnitId];
  const defenderUnit = UNITS[defenderUnitId];

  const defaultAttackerPool = attackerUnit
    ? phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons
    : [];
  const defaultDefenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];

  let attackerWeapons: SelectedWeapon[];
  let defenderWeapons: SelectedWeapon[];

  if (unitResolution.weaponsExplicit && attackerUnit) {
    const weaponResolution = await resolveWeapons(
      prompt,
      attackerUnit,
      defenderUnit,
      phase,
    );
    attackerWeapons = weaponResolution.attackerWeapons;
    defenderWeapons = weaponResolution.defenderWeapons;
  } else {
    attackerWeapons =
      defaultAttackerPool.length > 0
        ? [{ weaponName: defaultAttackerPool[0].name }]
        : [];
    defenderWeapons =
      defaultDefenderPool.length > 0
        ? [{ weaponName: defaultDefenderPool[0].name }]
        : [];
  }

  const combatFormState = {
    phase,
    attackerUnitId,
    attackerCount: unitResolution.attackerCount,
    attackerWeapons,
    attackerContext: DEFAULT_ATTACKER_CONTEXT,
    defenderUnitId,
    defenderCount: unitResolution.defenderCount,
    defenderInCover: unitResolution.defenderInCover,
    defenderWeapons,
    defenderContext: DEFAULT_ATTACKER_CONTEXT,
    firstFighter: unitResolution.firstFighter,
  };
  console.log("[parser] parsePrompt result:", combatFormState);
  return combatFormState;
};
