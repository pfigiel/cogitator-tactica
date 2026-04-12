# LLM Parser Two-Call Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single LLM call in `parsePrompt` into two targeted calls to reduce token usage by ~87%, with no changes to the public interface.

**Architecture:** Call 1 resolves unit identities and combat context from a compact name/id list (~3,000 tokens). Call 2 resolves weapon selection from only the two resolved units' weapon names — and only fires when the user's prompt explicitly mentions weapons. `parsePrompt` orchestrates both and returns the same `CombatFormState` shape as before.

**Tech Stack:** TypeScript, `@anthropic-ai/sdk`, Next.js (`@/` path aliases)

---

## Files

- Modify: `src/lib/llm/parser.ts` — only file changed

---

### Task 1: Add call-1 and call-2 infrastructure

Add new constants, interfaces, and private functions alongside the existing code. `parsePrompt` is left unchanged in this task so the file builds and behaves as before.

**Files:**
- Modify: `src/lib/llm/parser.ts`

- [ ] **Step 1: Add `UnitProfile` to imports**

Replace the existing import block at the top of `src/lib/llm/parser.ts`:

```ts
import {
  UnitProfile,
  CombatFormState,
  SelectedWeapon,
  DEFAULT_ATTACKER_CONTEXT,
} from "@/lib/calculator/types";
```

- [ ] **Step 2: Add call-1 constants and `resolveUnitsAndContext`**

Insert the following block after the `const client = new Anthropic();` line (before `const UNIT_DESCRIPTIONS`):

```ts
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
```

- [ ] **Step 3: Add call-2 infrastructure**

Insert the following block after `resolveUnitsAndContext` (still before `const UNIT_DESCRIPTIONS`):

```ts
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

interface WeaponResolution {
  attackerWeapons: SelectedWeapon[];
  defenderWeapons: SelectedWeapon[];
}

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
```

- [ ] **Step 4: Verify the build passes**

```bash
npx tsc --noEmit
```

Expected: no errors. The old `UNIT_DESCRIPTIONS`, `SYSTEM_PROMPT`, and `parsePrompt` are still present and unchanged, so behaviour is identical to before.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/parser.ts
git commit -m "feat: add two-call LLM infrastructure to parser"
```

---

### Task 2: Replace `parsePrompt` and remove old code

Wire up the new functions, replace `parsePrompt`, and delete the now-dead old constants and inline helper.

**Files:**
- Modify: `src/lib/llm/parser.ts`

- [ ] **Step 1: Replace `parsePrompt` and remove dead code**

Replace the entire contents of `src/lib/llm/parser.ts` from `const UNIT_DESCRIPTIONS` through the end of the file with:

```ts
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

  return {
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
};
```

- [ ] **Step 2: Verify the build passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/llm/parser.ts
git commit -m "feat: switch parsePrompt to two-call LLM strategy"
```
