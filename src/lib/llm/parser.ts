import Anthropic from "@anthropic-ai/sdk";
import {
  UnitProfile,
  CombatFormState,
  SelectedWeapon,
  DEFAULT_ATTACKER_CONTEXT,
} from "@/lib/calculator/types";
import { getUnit, searchUnitsByEmbedding } from "@/lib/db/units";
import { embedText } from "@/lib/embeddings/common/voyage";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// ─── ParsedContext: Pure JSON parsing helper ────────────────────────────────────

export type ParsedContext = {
  attackerName: string;
  defenderName: string;
  attackerCount: number;
  defenderCount: number;
  phase: "shooting" | "melee";
  defenderInCover: boolean;
  firstFighter: "attacker" | "defender";
  attackerWeaponNames: string[];
  defenderWeaponNames: string[];
};

export const parseContextFromJson = (text: string): ParsedContext => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON object found in: ${text}`);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
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
    firstFighter: parsed.firstFighter === "defender" ? "defender" : "attacker",
    attackerWeaponNames: Array.isArray(parsed.attackerWeaponNames)
      ? parsed.attackerWeaponNames.filter((w: unknown) => typeof w === "string")
      : [],
    defenderWeaponNames: Array.isArray(parsed.defenderWeaponNames)
      ? parsed.defenderWeaponNames.filter((w: unknown) => typeof w === "string")
      : [],
  };
};

// ─── Call 1: Context extraction (no unit list) ───────────────────────────────

const extractContext = async (prompt: string): Promise<ParsedContext> => {
  const systemPrompt = `You are a Warhammer 40,000 combat assistant. Extract combat parameters from the user's prompt.

Return a JSON object with:
- "attackerName": string — the attacker unit name as mentioned by the user
- "defenderName": string — the defender unit name as mentioned by the user
- "attackerCount": number — number of attacking models (default 1)
- "defenderCount": number — number of defending models (default 1)
- "phase": "shooting" | "melee" (default "shooting")
- "defenderInCover": boolean (default false)
- "firstFighter": "attacker" | "defender" (default "attacker")
- "attackerWeaponNames": string[] — weapon names mentioned for the attacker (empty array if none)
- "defenderWeaponNames": string[] — weapon names mentioned for the defender (empty array if none)

Return only a JSON object, no other text.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  return parseContextFromJson(rawText);
};

// ─── Unit resolution via vector search ──────────────────────────────────────

const resolveUnits = async (
  ctx: ParsedContext,
): Promise<{
  attackerUnit: UnitProfile | null;
  defenderUnit: UnitProfile | null;
}> => {
  const [attackerEmbedding, defenderEmbedding] = await Promise.all([
    embedText(ctx.attackerName),
    embedText(ctx.defenderName),
  ]);

  const [attackerMatches, defenderMatches] = await Promise.all([
    searchUnitsByEmbedding(attackerEmbedding),
    searchUnitsByEmbedding(defenderEmbedding),
  ]);

  const [attackerUnit, defenderUnit] = await Promise.all([
    attackerMatches[0] ? getUnit(attackerMatches[0].id) : null,
    defenderMatches[0] ? getUnit(defenderMatches[0].id) : null,
  ]);

  return { attackerUnit, defenderUnit };
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
type WeaponResolution = {
  attackerWeapons: SelectedWeapon[];
  defenderWeapons: SelectedWeapon[];
};

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
  ctx: ParsedContext,
  attackerUnit: UnitProfile,
  defenderUnit: UnitProfile | undefined,
  phase: "shooting" | "melee",
): Promise<WeaponResolution> => {
  console.log(
    "[parser] call2 input:",
    ctx.attackerWeaponNames,
    ctx.defenderWeaponNames,
  );
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    cache_control: { type: "ephemeral" },
    system: buildWeaponSystemPrompt(attackerUnit, defenderUnit, phase),
    messages: [
      {
        role: "user",
        content: [
          ctx.attackerWeaponNames.length > 0
            ? `Attacker weapons mentioned: ${ctx.attackerWeaponNames.join(", ")}`
            : "No specific attacker weapons mentioned.",
          ctx.defenderWeaponNames.length > 0
            ? `Defender weapons mentioned: ${ctx.defenderWeaponNames.join(", ")}`
            : "No specific defender weapons mentioned.",
        ].join("\n"),
      },
    ],
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
  const ctx = await extractContext(prompt);

  const { attackerUnit, defenderUnit } = await resolveUnits(ctx);

  if (!attackerUnit || !defenderUnit) {
    throw new Error(
      `Could not resolve units: attacker="${ctx.attackerName}", defender="${ctx.defenderName}"`,
    );
  }

  const phase = ctx.phase;

  const defaultAttackerPool =
    phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons;
  const defaultDefenderPool = defenderUnit.meleeWeapons;

  let attackerWeapons: SelectedWeapon[] =
    defaultAttackerPool.length > 0
      ? [{ weaponName: defaultAttackerPool[0].name }]
      : [];
  let defenderWeapons: SelectedWeapon[] =
    defaultDefenderPool.length > 0
      ? [{ weaponName: defaultDefenderPool[0].name }]
      : [];

  if (
    ctx.attackerWeaponNames.length > 0 ||
    ctx.defenderWeaponNames.length > 0
  ) {
    const weaponResolution = await resolveWeapons(
      ctx,
      attackerUnit,
      defenderUnit,
      phase,
    );
    attackerWeapons = weaponResolution.attackerWeapons;
    defenderWeapons = weaponResolution.defenderWeapons;
  }

  const result = {
    phase,
    attackerUnitId: attackerUnit.id,
    attackerCount: ctx.attackerCount,
    attackerWeapons,
    attackerContext: DEFAULT_ATTACKER_CONTEXT,
    defenderUnitId: defenderUnit.id,
    defenderCount: ctx.defenderCount,
    defenderInCover: ctx.defenderInCover,
    defenderWeapons,
    defenderContext: DEFAULT_ATTACKER_CONTEXT,
    firstFighter: ctx.firstFighter,
  };
  console.log("[parser] parsePrompt result:", result);
  return result;
};
