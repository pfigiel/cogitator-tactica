# Unit Vector Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-unit-list LLM prompt with a two-phase pipeline: LLM extracts names/context, Voyage AI vector search resolves names to unit IDs.

**Architecture:** `extractContext` (LLM, no unit list) → `resolveUnits` (Voyage AI embed + pgvector cosine search) → `resolveWeapons` (LLM with extracted weapon names instead of raw prompt). Embeddings are generated offline by a separate script after each import.

**Tech Stack:** Voyage AI (`voyageai` npm package, `voyage-3` model, 1024 dims), pgvector (`<=>` cosine distance), Prisma `$queryRaw`, Vitest

---

## File Map

| File                                                           | Action | Responsibility                                             |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| `src/lib/voyage.ts`                                            | Create | Voyage AI client — `embedText` / `embedTexts`              |
| `src/lib/db/units.ts`                                          | Modify | Add `searchUnitsByEmbedding`                               |
| `src/lib/llm/parser.ts`                                        | Modify | Refactor to three-phase pipeline; add `ParsedContext` type |
| `scripts/generate-embeddings/index.ts`                         | Create | Batch embedding generation script                          |
| `scripts/generate-embeddings/index.test.ts`                    | Create | Unit test for `buildUnitEmbeddingText`                     |
| `prisma/schema.prisma`                                         | Modify | `vector(1536)` → `vector(1024)`                            |
| `prisma/migrations/<timestamp>_resize_embedding/migration.sql` | Create | SQL to drop + re-add embedding column at new size          |
| `.env.example`                                                 | Modify | Add `VOYAGE_API_KEY`                                       |
| `package.json`                                                 | Modify | Add `voyageai` dependency + `generate-embeddings` script   |

---

## Task 1: Install `voyageai` and update env

**Files:**

- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install the voyageai package**

```bash
npm install voyageai
```

Expected: `voyageai` appears in `package.json` dependencies.

- [ ] **Step 2: Add VOYAGE_API_KEY to .env.example**

In `.env.example`, add after the existing `ANTHROPIC_API_KEY` line:

```
VOYAGE_API_KEY=your_voyage_api_key_here
```

- [ ] **Step 3: Add the generate-embeddings script to package.json**

In `package.json`, add to the `"scripts"` block after `"import-units"`:

```json
"generate-embeddings": "tsx scripts/generate-embeddings/index.ts"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add voyageai dependency and VOYAGE_API_KEY env var"
```

---

## Task 2: Create Voyage AI client

**Files:**

- Create: `src/lib/voyage.ts`

- [ ] **Step 1: Create `src/lib/voyage.ts`**

```typescript
import VoyageAI from "voyageai";

const client = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY ?? "" });

const MODEL = "voyage-3";

export const embedText = async (text: string): Promise<number[]> => {
  const result = await client.embed({ input: [text], model: MODEL });
  return result.data[0].embedding as number[];
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const result = await client.embed({ input: texts, model: MODEL });
  return result.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/voyage.ts
git commit -m "feat: add Voyage AI client"
```

---

## Task 3: Schema migration — resize embedding column

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_resize_embedding/migration.sql`

- [ ] **Step 1: Update schema.prisma**

In `prisma/schema.prisma`, change the `embedding` field on the `Unit` model from:

```
embedding Unsupported("vector(1536)")?
```

to:

```
embedding Unsupported("vector(1024)")?
```

- [ ] **Step 2: Create the migration file**

```bash
npx prisma migrate dev --name resize_embedding --create-only
```

Expected: A new file `prisma/migrations/<timestamp>_resize_embedding/migration.sql` is created (Prisma cannot auto-diff unsupported types so the file may be empty).

- [ ] **Step 3: Replace the migration SQL content**

Open the generated migration file and replace its contents with:

```sql
ALTER TABLE "units" DROP COLUMN "embedding";
ALTER TABLE "units" ADD COLUMN "embedding" vector(1024);
```

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: resize unit embedding column to 1024 dims for Voyage AI"
```

---

## Task 4: Add `searchUnitsByEmbedding` to DB layer

**Files:**

- Modify: `src/lib/db/units.ts`

- [ ] **Step 1: Add the import for `Prisma` at the top of `src/lib/db/units.ts`**

Change the first line from:

```typescript
import { prisma } from ".";
```

to:

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from ".";
```

- [ ] **Step 2: Add `searchUnitsByEmbedding` at the end of `src/lib/db/units.ts`**

```typescript
export const searchUnitsByEmbedding = async (
  embedding: number[],
  limit = 1,
): Promise<Array<{ id: string; name: string }>> => {
  const vectorLiteral = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
  return prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM units
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}
    LIMIT ${limit}
  `;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/units.ts
git commit -m "feat: add searchUnitsByEmbedding to DB layer"
```

---

## Task 5: Implement and test `buildUnitEmbeddingText`

**Files:**

- Create: `scripts/generate-embeddings/index.ts` (the exported helper only — main added in Task 6)
- Create: `scripts/generate-embeddings/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/generate-embeddings/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildUnitEmbeddingText } from "./index";

describe("buildUnitEmbeddingText", () => {
  it("combines name, keywords, and weapon names into a single string", () => {
    const result = buildUnitEmbeddingText({
      name: "Space Marine Intercessors",
      keywords: ["INFANTRY", "ADEPTUS ASTARTES"],
      weapons: ["Bolt Rifle", "Bolt Pistol"],
    });
    expect(result).toBe(
      "Space Marine Intercessors INFANTRY ADEPTUS ASTARTES Bolt Rifle Bolt Pistol",
    );
  });

  it("handles a unit with no keywords", () => {
    const result = buildUnitEmbeddingText({
      name: "Test Unit",
      keywords: [],
      weapons: ["Chainsword"],
    });
    expect(result).toBe("Test Unit Chainsword");
  });

  it("handles a unit with no weapons", () => {
    const result = buildUnitEmbeddingText({
      name: "Test Unit",
      keywords: ["INFANTRY"],
      weapons: [],
    });
    expect(result).toBe("Test Unit INFANTRY");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run scripts/generate-embeddings/index.test.ts
```

Expected: FAIL — `buildUnitEmbeddingText` not found.

- [ ] **Step 3: Create `scripts/generate-embeddings/index.ts` with just the exported helper**

```typescript
import { embedTexts } from "../../src/lib/voyage";
import { PrismaClient, Prisma, Faction } from "@prisma/client";

const prisma = new PrismaClient();

export const buildUnitEmbeddingText = (unit: {
  name: string;
  keywords: string[];
  weapons: string[];
}): string => [unit.name, ...unit.keywords, ...unit.weapons].join(" ");
```

(The `main` function will be added in Task 6.)

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run scripts/generate-embeddings/index.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-embeddings/index.ts scripts/generate-embeddings/index.test.ts
git commit -m "feat: add buildUnitEmbeddingText with tests"
```

---

## Task 6: Complete the embedding generation script

**Files:**

- Modify: `scripts/generate-embeddings/index.ts`

- [ ] **Step 1: Add the `main` function to `scripts/generate-embeddings/index.ts`**

Append after the `buildUnitEmbeddingText` export:

```typescript
const BATCH_SIZE = 128;

const main = async () => {
  const { values } = (await import("node:util")).parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: {
        type: "string",
        default: Object.values(Faction).join(","),
      },
    },
  });

  const factions = (values.factions as string)
    .split(",")
    .map((f) => f.trim()) as Faction[];

  const units = await prisma.unit.findMany({
    where: { factionId: { in: factions } },
    include: { unitWeapons: { include: { weapon: true } } },
  });

  console.log(`Generating embeddings for ${units.length} units...`);

  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);
    const texts = batch.map((u) =>
      buildUnitEmbeddingText({
        name: u.name,
        keywords: u.keywords,
        weapons: u.unitWeapons.map((uw) => uw.weapon.name),
      }),
    );

    const embeddings = await embedTexts(texts);

    for (let j = 0; j < batch.length; j++) {
      const vectorLiteral = Prisma.raw(
        `'[${embeddings[j].join(",")}]'::vector`,
      );
      await prisma.$executeRaw`
        UPDATE units SET embedding = ${vectorLiteral} WHERE id = ${batch[j].id}
      `;
    }

    console.log(
      `  ${Math.min(i + BATCH_SIZE, units.length)}/${units.length} done`,
    );
  }

  console.log("All embeddings generated.");
  await prisma.$disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the test still passes**

```bash
npx vitest run scripts/generate-embeddings/index.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-embeddings/index.ts
git commit -m "feat: complete generate-embeddings script"
```

---

## Task 7: Refactor `parser.ts` — add `ParsedContext` type and `parseContextFromJson` helper

**Files:**

- Modify: `src/lib/llm/parser.ts`
- Create: `src/lib/llm/parser.test.ts`

This task introduces the `ParsedContext` type and a pure JSON-parsing helper (`parseContextFromJson`) that will be tested before wiring into the LLM call.

- [ ] **Step 1: Write the failing test**

Create `src/lib/llm/parser.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseContextFromJson } from "./parser";

describe("parseContextFromJson", () => {
  it("parses a complete valid response", () => {
    const json = JSON.stringify({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 5,
      defenderCount: 10,
      phase: "shooting",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponNames: ["Bolt Rifle"],
      defenderWeaponNames: [],
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
      attackerWeaponNames: ["Bolt Rifle"],
      defenderWeaponNames: [],
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
    expect(result.attackerWeaponNames).toEqual([]);
    expect(result.defenderWeaponNames).toEqual([]);
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run src/lib/llm/parser.test.ts
```

Expected: FAIL — `parseContextFromJson` not exported.

- [ ] **Step 3: Add `ParsedContext` type and `parseContextFromJson` to `src/lib/llm/parser.ts`**

At the top of `src/lib/llm/parser.ts`, after existing imports, add:

```typescript
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run src/lib/llm/parser.test.ts
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/parser.ts src/lib/llm/parser.test.ts
git commit -m "feat: add ParsedContext type and parseContextFromJson with tests"
```

---

## Task 8: Replace `resolveUnitsAndContext` with `extractContext` in parser.ts

**Files:**

- Modify: `src/lib/llm/parser.ts`

- [ ] **Step 1: Add the import for `embedText` at the top of `src/lib/llm/parser.ts`**

Add alongside existing imports:

```typescript
import { embedText } from "@/lib/voyage";
import { searchUnitsByEmbedding } from "@/lib/db/units";
```

- [ ] **Step 2: Replace the `resolveUnitsAndContext` function with `extractContext`**

Remove the entire `resolveUnitsAndContext` function (which currently calls `listUnits` and builds `systemPromptUnits`). Replace it with:

```typescript
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
```

- [ ] **Step 3: Add `resolveUnits` after `extractContext`**

```typescript
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run existing tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/parser.ts
git commit -m "feat: replace resolveUnitsAndContext with extractContext + resolveUnits"
```

---

## Task 9: Update `resolveWeapons` and wire `parsePrompt`

**Files:**

- Modify: `src/lib/llm/parser.ts`

- [ ] **Step 1: Replace the entire `resolveWeapons` function in `src/lib/llm/parser.ts`**

Find the existing `resolveWeapons` function (which starts with `const resolveWeapons = async (prompt: string, ...`) and replace it in full with:

```typescript
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
```

- [ ] **Step 2: Update `parsePrompt` to use the new three-phase pipeline**

Replace the entire `parsePrompt` function with:

```typescript
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
```

- [ ] **Step 3: Remove the now-unused `listUnits` import**

In the imports at the top of `src/lib/llm/parser.ts`, remove `listUnits` from the `@/lib/db/units` import:

```typescript
import { getUnit, searchUnitsByEmbedding } from "@/lib/db/units";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/parser.ts
git commit -m "feat: wire three-phase parsePrompt pipeline"
```

---

## Task 10: Add VOYAGE_API_KEY to local env and smoke test

**Files:**

- Modify: `.env` (local only, not committed)

- [ ] **Step 1: Add VOYAGE_API_KEY to your local `.env` file**

Obtain an API key from [https://www.voyageai.com](https://www.voyageai.com) and add to `.env`:

```
VOYAGE_API_KEY=pa-...
```

- [ ] **Step 2: Run the generate-embeddings script**

```bash
npm run generate-embeddings
```

Expected output similar to:

```
Generating embeddings for 42 units...
  42/42 done
All embeddings generated.
```

- [ ] **Step 3: Smoke test the parser via the app**

Start the dev server and submit a prompt through the UI (e.g. "5 intercessors shooting at 10 ork boyz"). Verify the form populates with the correct units and weapons.

```bash
npm run dev
```

- [ ] **Step 4: Final commit if any loose ends**

```bash
git add -p  # stage only intended changes
git commit -m "chore: smoke test complete, unit vector search end-to-end"
```
