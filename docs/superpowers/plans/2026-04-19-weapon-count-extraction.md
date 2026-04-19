# Weapon Count Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the LLM parser to extract per-weapon model counts from prompts and populate `SelectedWeapon.modelCount` correctly.

**Architecture:** Enrich `ParsedContext` to carry `WeaponHint[]` (name + optional count) instead of `string[]`. Call 1's LLM extracts counts when explicitly stated. Call 2 receives counts in its user message and passes them through to `SelectedWeapon.modelCount`.

**Tech Stack:** TypeScript, Vitest, Anthropic SDK (claude-haiku-4-5-20251001)

---

### Task 1: Add `WeaponHint` type and update `ParsedContext`

**Files:**

- Modify: `src/lib/llm/parser.ts:23-35`

- [ ] **Step 1: Add `WeaponHint` export and update `ParsedContext`**

In `src/lib/llm/parser.ts`, replace the existing `ParsedContext` type (lines 23–35):

```ts
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
```

- [ ] **Step 2: Verify TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -40`

Expected: errors on every reference to `attackerWeaponNames` / `defenderWeaponNames` in `parser.ts` and `parser.test.ts`. That's correct — we'll fix them in subsequent tasks.

---

### Task 2: Update `parseContextFromJson` to parse weapon hints

**Files:**

- Modify: `src/lib/llm/parser.ts:37-77`
- Modify: `src/lib/llm/parser.test.ts`

- [ ] **Step 1: Write failing tests**

Replace the full contents of `src/lib/llm/parser.test.ts` with:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/embeddings/common/voyage", () => ({
  embedText: vi.fn(),
  embedTexts: vi.fn(),
}));
vi.mock("@/lib/db/units", () => ({
  getUnit: vi.fn(),
  searchUnitsByEmbedding: vi.fn(),
}));

import { parseContextFromJson } from "./parser";

describe("parseContextFromJson", () => {
  it("parses weapon hints with counts", () => {
    const json = JSON.stringify({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 10,
      defenderCount: 20,
      phase: "melee",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponHints: [{ name: "Bolt Rifle" }],
      defenderWeaponHints: [
        { name: "Choppa", count: 19 },
        { name: "Big Choppa", count: 1 },
      ],
    });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([{ name: "Bolt Rifle" }]);
    expect(result.defenderWeaponHints).toEqual([
      { name: "Choppa", count: 19 },
      { name: "Big Choppa", count: 1 },
    ]);
  });

  it("drops invalid count values (non-finite numbers)", () => {
    const json = JSON.stringify({
      attackerName: "A",
      defenderName: "B",
      attackerWeaponHints: [{ name: "Sword", count: "lots" }],
      defenderWeaponHints: [{ name: "Axe", count: null }],
    });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([{ name: "Sword" }]);
    expect(result.defenderWeaponHints).toEqual([{ name: "Axe" }]);
  });

  it("drops entries that are not objects with a string name", () => {
    const json = JSON.stringify({
      attackerName: "A",
      defenderName: "B",
      attackerWeaponHints: [{ name: "Valid" }, "bare string", 42, null],
      defenderWeaponHints: [],
    });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([{ name: "Valid" }]);
  });

  it("defaults to empty arrays when hints are absent", () => {
    const json = JSON.stringify({ attackerName: "A", defenderName: "B" });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([]);
    expect(result.defenderWeaponHints).toEqual([]);
  });

  it("parses a complete valid response", () => {
    const json = JSON.stringify({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 5,
      defenderCount: 10,
      phase: "shooting",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponHints: [{ name: "Bolt Rifle" }],
      defenderWeaponHints: [],
    });
    const result = parseContextFromJson(json);
    expect(result).toEqual({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 5,
      defenderCount: 10,
      phase: "shooting",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponHints: [{ name: "Bolt Rifle" }],
      defenderWeaponHints: [],
    });
  });

  it("applies defaults for missing optional fields", () => {
    const json = JSON.stringify({
      attackerName: "Intercessors",
      defenderName: "Boyz",
    });
    const result = parseContextFromJson(json);
    expect(result.phase).toBe("shooting");
    expect(result.attackerCount).toBe(1);
    expect(result.defenderCount).toBe(1);
    expect(result.defenderInCover).toBe(false);
    expect(result.firstFighter).toBe("attacker");
    expect(result.attackerWeaponHints).toEqual([]);
    expect(result.defenderWeaponHints).toEqual([]);
  });

  it("throws if attackerName or defenderName is missing", () => {
    expect(() =>
      parseContextFromJson(JSON.stringify({ attackerName: "A" })),
    ).toThrow();
    expect(() =>
      parseContextFromJson(JSON.stringify({ defenderName: "B" })),
    ).toThrow();
  });

  it("clamps counts to a minimum of 1", () => {
    const json = JSON.stringify({
      attackerName: "A",
      defenderName: "B",
      attackerCount: 0,
      defenderCount: -3,
    });
    const result = parseContextFromJson(json);
    expect(result.attackerCount).toBe(1);
    expect(result.defenderCount).toBe(1);
  });
});

describe("parseContextFromJson faction fields", () => {
  const base = {
    attackerName: "Intercessors",
    defenderName: "Boyz",
    attackerCount: 10,
    defenderCount: 20,
    phase: "shooting",
    defenderInCover: false,
    firstFighter: "attacker",
    attackerWeaponHints: [],
    defenderWeaponHints: [],
  };

  it("parses attackerFactionId and defenderFactionId when present", () => {
    const result = parseContextFromJson(
      JSON.stringify({
        ...base,
        attackerFactionId: "SM",
        defenderFactionId: "ORK",
      }),
    );
    expect(result.attackerFactionId).toBe("SM");
    expect(result.defenderFactionId).toBe("ORK");
  });

  it("sets faction ids to undefined when LLM returns null", () => {
    const result = parseContextFromJson(
      JSON.stringify({
        ...base,
        attackerFactionId: null,
        defenderFactionId: null,
      }),
    );
    expect(result.attackerFactionId).toBeUndefined();
    expect(result.defenderFactionId).toBeUndefined();
  });

  it("sets faction ids to undefined when fields are absent", () => {
    const result = parseContextFromJson(JSON.stringify(base));
    expect(result.attackerFactionId).toBeUndefined();
    expect(result.defenderFactionId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --reporter=verbose src/lib/llm/parser.test.ts`

Expected: multiple FAIL — `attackerWeaponHints` is undefined on the result.

- [ ] **Step 3: Update `parseContextFromJson` to parse weapon hints**

Replace lines 62–67 in `src/lib/llm/parser.ts` (the `attackerWeaponNames`/`defenderWeaponNames` parsing block) with:

```ts
    attackerWeaponHints: parseWeaponHints(parsed.attackerWeaponHints),
    defenderWeaponHints: parseWeaponHints(parsed.defenderWeaponHints),
```

And add this helper function immediately before `parseContextFromJson` (at line 37):

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --reporter=verbose src/lib/llm/parser.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/parser.ts src/lib/llm/parser.test.ts
git commit -m "feat: replace weaponNames with WeaponHint[] in ParsedContext"
```

---

### Task 3: Update call 1 system prompt to extract weapon hints with counts

**Files:**

- Modify: `src/lib/llm/parser.ts` (the `extractContext` function, lines ~89–109)

- [ ] **Step 1: Replace the system prompt in `extractContext`**

In `src/lib/llm/parser.ts`, replace the `systemPrompt` string inside `extractContext` with:

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep parser`

Expected: remaining errors are only in `resolveUnits` and `resolveWeapons` which reference the old field names. We fix those next.

---

### Task 4: Update `resolveUnits` to use `attackerWeaponHints`/`defenderWeaponHints`

**Files:**

- Modify: `src/lib/llm/parser.ts` (the `resolveUnits` function, lines ~128–187)

- [ ] **Step 1: Replace field references in `resolveUnits`**

In `resolveUnits`, the `buildUnitEmbeddingText` calls reference `ctx.attackerWeaponNames` and `ctx.defenderWeaponNames`. Replace them to use `.map(h => h.name)`:

```ts
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
```

Also update the `searchUnitsByEmbedding` calls to use `ctx.attackerWeaponHints.length` / `ctx.defenderWeaponHints.length` as the conditional guard (they already use `ctx.attackerFactionId` / `ctx.defenderFactionId` which are unchanged).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep parser`

Expected: only `resolveWeapons` errors remain.

---

### Task 5: Update `resolveWeapons` to pass counts to call 2

**Files:**

- Modify: `src/lib/llm/parser.ts` (the `resolveWeapons` function, lines ~274–349)

- [ ] **Step 1: Update function signature**

The `resolveWeapons` signature currently takes `ctx: ParsedContext`. No signature change needed — it already has access to `ctx.attackerWeaponHints` / `ctx.defenderWeaponHints` once the type is updated.

- [ ] **Step 2: Update the user message to include counts**

Replace the user message content block inside `resolveWeapons`:

```ts
    messages: [
      {
        role: "user",
        content: [
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
        ].join("\n"),
      },
    ],
```

- [ ] **Step 3: Update the console.log on the input line**

Replace the existing `console.log("[parser] call2 input:", ...)` line:

```ts
console.log(
  "[parser] call2 input:",
  ctx.attackerWeaponHints,
  ctx.defenderWeaponHints,
);
```

- [ ] **Step 4: Update guard in `parsePrompt`**

In `parsePrompt` (lines ~380–392), the condition that decides whether to call `resolveWeapons` currently reads:

```ts
  if (
    ctx.attackerWeaponNames.length > 0 ||
    ctx.defenderWeaponNames.length > 0
  ) {
```

Replace with:

```ts
  if (
    ctx.attackerWeaponHints.length > 0 ||
    ctx.defenderWeaponHints.length > 0
  ) {
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit 2>&1 | grep -c "error"`

Expected: `0`

- [ ] **Step 6: Run full test suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/llm/parser.ts
git commit -m "feat: pass weapon counts from ParsedContext to call 2 user message"
```

---

### Self-Review Notes

- Task 1 introduces the type; Tasks 2–5 fix all downstream references in sequence — no task references a field before it's defined.
- `parseWeaponHints` helper is introduced in Task 2 alongside the tests that cover it.
- The `searchUnitsByFuzzyNameMatch` calls in `resolveUnits` use `attackerBest`/`defenderBest` from the embedding search result — they don't reference weapon names directly, so no update needed there.
- Form population (WeaponSelector fallback) confirmed unchanged — `sw.entry.modelCount ?? defaultModelCount` already handles the case.
