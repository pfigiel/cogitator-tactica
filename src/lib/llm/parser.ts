import Anthropic from "@anthropic-ai/sdk";
import {
  UnitProfile,
  WeaponProfile,
  CombatFormState,
  SelectedWeapon,
  DEFAULT_ATTACKER_CONTEXT,
} from "@/lib/calculator/types";
import {
  getUnit,
  searchUnitsByEmbedding,
  searchUnitsByFuzzyNameMatch,
} from "@/lib/db/units";
import { getAllFactions } from "@/lib/db/factions";
import type { FactionRecord } from "@/lib/db/factions";
import { embedText } from "@/lib/embeddings/common/voyage";
import { buildUnitEmbeddingText } from "@/lib/embeddings/units/buildUnitEmbeddingText";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// ─── ParsedContext: Pure JSON parsing helper ────────────────────────────────────

export type WeaponHint = { name: string; count?: number };

export type ParsedContext = {
  attackerName: string;
  defenderName: string;
  attackerCount: number;
  defenderCount: number;
  phase: "shooting" | "melee";
  defenderInCover: boolean;
  firstFighter: "attacker" | "defender";
  attackerWeaponHints: WeaponHint[];
  defenderWeaponHints: WeaponHint[];
  attackerFactionId?: string;
  defenderFactionId?: string;
};

const parseWeaponHints = (raw: unknown): WeaponHint[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof item.name !== "string")
      return [];
    const hint: WeaponHint = { name: item.name };
    if (item.count != null && Number.isFinite(Number(item.count)))
      hint.count = Math.max(1, Number(item.count));
    return [hint];
  });
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
    attackerWeaponHints: parseWeaponHints(parsed.attackerWeaponHints),
    defenderWeaponHints: parseWeaponHints(parsed.defenderWeaponHints),
    attackerFactionId:
      typeof parsed.attackerFactionId === "string"
        ? parsed.attackerFactionId
        : undefined,
    defenderFactionId:
      typeof parsed.defenderFactionId === "string"
        ? parsed.defenderFactionId
        : undefined,
  };
};

// ─── Call 1: Context extraction (no unit list) ───────────────────────────────

const extractContext = async (
  prompt: string,
  factions: FactionRecord[],
): Promise<ParsedContext> => {
  const factionsContext = factions
    .map((f) => `- ${f.name} (id: "${f.id}")`)
    .join("\n");

  const systemPrompt = `You are a Warhammer 40,000 combat assistant. Extract combat parameters from the user's prompt.

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
  factions: FactionRecord[],
): Promise<{
  attackerUnit: UnitProfile | null;
  defenderUnit: UnitProfile | null;
}> => {
  const getFactionName = (id: string | undefined): string | undefined =>
    id ? factions.find((f) => f.id === id)?.name : undefined;

  const weaponLabel = ctx.phase === "shooting" ? "ranged" : "melee";

  const attackerText = buildUnitEmbeddingText({
    name: ctx.attackerName,
    faction: getFactionName(ctx.attackerFactionId),
    ...(weaponLabel === "ranged" && ctx.attackerWeaponHints.length
      ? { rangedWeapons: ctx.attackerWeaponHints.map((h) => h.name) }
      : {}),
    ...(weaponLabel === "melee" && ctx.attackerWeaponHints.length
      ? { meleeWeapons: ctx.attackerWeaponHints.map((h) => h.name) }
      : {}),
  });

  const defenderText = buildUnitEmbeddingText({
    name: ctx.defenderName,
    faction: getFactionName(ctx.defenderFactionId),
    ...(weaponLabel === "ranged" && ctx.defenderWeaponHints.length
      ? { rangedWeapons: ctx.defenderWeaponHints.map((h) => h.name) }
      : {}),
    ...(weaponLabel === "melee" && ctx.defenderWeaponHints.length
      ? { meleeWeapons: ctx.defenderWeaponHints.map((h) => h.name) }
      : {}),
  });

  const [attackerEmbedding, defenderEmbedding] = await Promise.all([
    embedText(attackerText),
    embedText(defenderText),
  ]);

  const [attackerMatches, defenderMatches] = await Promise.all([
    searchUnitsByEmbedding(attackerEmbedding, 5, ctx.attackerFactionId),
    searchUnitsByEmbedding(defenderEmbedding, 5, ctx.defenderFactionId),
  ]);

  const attackerBest = searchUnitsByFuzzyNameMatch(
    ctx.attackerName,
    attackerMatches,
  );
  const defenderBest = searchUnitsByFuzzyNameMatch(
    ctx.defenderName,
    defenderMatches,
  );

  const [attackerUnit, defenderUnit] = await Promise.all([
    attackerBest ? getUnit(attackerBest.id) : null,
    defenderBest ? getUnit(defenderBest.id) : null,
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

const normalizeWeaponName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[''`\u2019]/g, "'")
    .trim();

const parseWeaponList = (
  raw: unknown,
  pool: WeaponProfile[],
  fallbackId: string | undefined,
): SelectedWeapon[] => {
  if (Array.isArray(raw) && raw.length > 0) {
    const result: SelectedWeapon[] = raw
      .filter((item) => item && typeof item.weaponName === "string")
      .flatMap((item) => {
        const match = pool.find(
          (w) =>
            normalizeWeaponName(w.name) ===
            normalizeWeaponName(item.weaponName as string),
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
};

const resolveWeapons = async (
  ctx: ParsedContext,
  attackerUnit: UnitProfile,
  defenderUnit: UnitProfile | undefined,
  phase: "shooting" | "melee",
): Promise<WeaponResolution> => {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    cache_control: { type: "ephemeral" },
    system: buildWeaponSystemPrompt(attackerUnit, defenderUnit, phase),
    messages: [
      {
        role: "user",
        content: [
          ctx.attackerWeaponHints.length > 0
            ? `Attacker weapons mentioned: ${ctx.attackerWeaponHints
                .map((h) =>
                  h.count != null ? `${h.name} (${h.count})` : h.name,
                )
                .join(", ")}`
            : "No specific attacker weapons mentioned.",
          ctx.defenderWeaponHints.length > 0
            ? `Defender weapons mentioned: ${ctx.defenderWeaponHints
                .map((h) =>
                  h.count != null ? `${h.name} (${h.count})` : h.name,
                )
                .join(", ")}`
            : "No specific defender weapons mentioned.",
        ].join("\n"),
      },
    ],
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)[0];

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
      attackerPool,
      attackerPool[0]?.id,
    ),
    defenderWeapons:
      phase === "melee"
        ? parseWeaponList(
            parsed.defenderWeapons,
            defenderPool,
            defenderPool[0]?.id,
          )
        : defenderPool.length > 0
          ? [{ weaponId: defenderPool[0].id }]
          : [],
  };
  return weaponResult;
};

export const parsePrompt = async (prompt: string): Promise<CombatFormState> => {
  const factions = await getAllFactions();
  const ctx = await extractContext(prompt, factions);

  const { attackerUnit, defenderUnit } = await resolveUnits(ctx, factions);

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
      ? [{ weaponId: defaultAttackerPool[0].id }]
      : [];
  let defenderWeapons: SelectedWeapon[] =
    defaultDefenderPool.length > 0
      ? [{ weaponId: defaultDefenderPool[0].id }]
      : [];

  if (
    ctx.attackerWeaponHints.length > 0 ||
    ctx.defenderWeaponHints.length > 0
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
  return result;
};
