# Improve Embeddings and Unit Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unstructured unit embeddings with structured, aligned embeddings and add faction-based hard filtering to improve vector search accuracy.

**Architecture:** A shared `buildUnitEmbeddingText` function produces structured text used for both DB import embeddings and runtime query embeddings, guaranteeing alignment. The LLM's first call is extended to extract explicit faction mentions, which are used as a hard `WHERE faction_id = ?` filter in the vector search query.

**Tech Stack:** TypeScript, Prisma ORM, PostgreSQL + pgvector, Voyage AI, Vitest, Anthropic SDK (Claude Haiku)

---

## File Map

| Status | File                                                      | Change                                                             |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------ |
| Create | `src/lib/embeddings/common/voyage.ts`                     | Moved from `src/lib/voyage.ts`                                     |
| Delete | `src/lib/voyage.ts`                                       | Replaced by above                                                  |
| Create | `src/lib/embeddings/units/buildUnitEmbeddingText.ts`      | Shared embedding text builder                                      |
| Create | `src/lib/embeddings/units/buildUnitEmbeddingText.test.ts` | Tests                                                              |
| Modify | `prisma/schema.prisma`                                    | Drop `Faction` enum, add `Faction` model                           |
| Create | `prisma/migrations/<ts>_add_factions_table/migration.sql` | Manual SQL migration                                               |
| Modify | `scripts/import-wahapedia/parse.ts`                       | Add `FactionRow`, parse `Factions.csv`                             |
| Modify | `scripts/import-wahapedia/transform.ts`                   | Add `factions` to `TransformResult`                                |
| Modify | `scripts/import-wahapedia/db.ts`                          | Upsert factions, remove `toFaction()`                              |
| Create | `src/lib/db/factions.ts`                                  | `getAllFactions()` DB query                                        |
| Modify | `src/lib/db/units.ts`                                     | Add `factionId` filter to `searchUnitsByEmbedding`                 |
| Modify | `src/lib/llm/parser.ts`                                   | Extend `ParsedContext`, use structured embeddings + faction filter |
| Create | `src/lib/llm/parser.test.ts`                              | Tests for `parseContextFromJson`                                   |
| Modify | `scripts/generate-embeddings/index.ts`                    | Use shared `buildUnitEmbeddingText`, remove enum                   |

---

## Task 1: Move Voyage AI client to embeddings module

**Files:**

- Create: `src/lib/embeddings/common/voyage.ts`
- Delete: `src/lib/voyage.ts`

- [ ] **Step 1: Create the new file**

```typescript
// src/lib/embeddings/common/voyage.ts
const API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";

type EmbedResponse = {
  data: Array<{ embedding: number[]; index: number }>;
};

const embed = async (input: string[]): Promise<number[][]> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ input, model: MODEL }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as EmbedResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
};

export const embedText = async (text: string): Promise<number[]> => {
  const results = await embed([text]);
  return results[0];
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  return embed(texts);
};
```

- [ ] **Step 2: Update import in `src/lib/llm/parser.ts`**

Change line 9:

```typescript
// Before
import { embedText } from "@/lib/voyage";

// After
import { embedText } from "@/lib/embeddings/common/voyage";
```

- [ ] **Step 3: Update import in `scripts/generate-embeddings/index.ts`**

Change line 14:

```typescript
// Before
const { embedTexts } = await import("../../src/lib/voyage");

// After
const { embedTexts } = await import("../../src/lib/embeddings/common/voyage");
```

- [ ] **Step 4: Delete the old file**

```bash
rm src/lib/voyage.ts
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/embeddings/common/voyage.ts src/lib/voyage.ts src/lib/llm/parser.ts scripts/generate-embeddings/index.ts
git commit -m "refactor: move voyage.ts to src/lib/embeddings/common/voyage.ts"
```

---

## Task 2: Create shared `buildUnitEmbeddingText` utility

**Files:**

- Create: `src/lib/embeddings/units/buildUnitEmbeddingText.ts`
- Create: `src/lib/embeddings/units/buildUnitEmbeddingText.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/embeddings/units/buildUnitEmbeddingText.test.ts
import { describe, it, expect } from "vitest";
import { buildUnitEmbeddingText } from "./buildUnitEmbeddingText";

describe("buildUnitEmbeddingText", () => {
  it("includes all fields when all are provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Intercessor Squad",
      faction: "Space Marines",
      meleeWeapons: ["Astartes chainsword", "Close combat weapon"],
      rangedWeapons: ["Bolt rifle", "Grenade Launcher"],
    });
    expect(result).toBe(
      "Unit: Intercessor Squad\nFaction: Space Marines\nMelee weapons: Astartes chainsword, Close combat weapon\nRanged weapons: Bolt rifle, Grenade Launcher",
    );
  });

  it("omits faction line when faction is not provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Intercessor Squad",
      rangedWeapons: ["Bolt rifle"],
    });
    expect(result).toBe("Unit: Intercessor Squad\nRanged weapons: Bolt rifle");
  });

  it("omits weapons sections when arrays are empty", () => {
    const result = buildUnitEmbeddingText({
      name: "Intercessor Squad",
      faction: "Space Marines",
      meleeWeapons: [],
      rangedWeapons: [],
    });
    expect(result).toBe("Unit: Intercessor Squad\nFaction: Space Marines");
  });

  it("omits weapons sections when arrays are undefined", () => {
    const result = buildUnitEmbeddingText({ name: "Ork Boyz" });
    expect(result).toBe("Unit: Ork Boyz");
  });

  it("includes only ranged weapons when only ranged provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Ork Boyz",
      faction: "Orks",
      rangedWeapons: ["Shoota"],
    });
    expect(result).toBe(
      "Unit: Ork Boyz\nFaction: Orks\nRanged weapons: Shoota",
    );
  });

  it("includes only melee weapons when only melee provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Ork Boyz",
      faction: "Orks",
      meleeWeapons: ["Choppa"],
    });
    expect(result).toBe("Unit: Ork Boyz\nFaction: Orks\nMelee weapons: Choppa");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/embeddings/units/buildUnitEmbeddingText.test.ts
```

Expected: FAIL — `Cannot find module './buildUnitEmbeddingText'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/embeddings/units/buildUnitEmbeddingText.ts
export type UnitEmbeddingParams = {
  name: string;
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};

export const buildUnitEmbeddingText = ({
  name,
  faction,
  meleeWeapons,
  rangedWeapons,
}: UnitEmbeddingParams): string => {
  const lines = [`Unit: ${name}`];
  if (faction) lines.push(`Faction: ${faction}`);
  if (meleeWeapons?.length)
    lines.push(`Melee weapons: ${meleeWeapons.join(", ")}`);
  if (rangedWeapons?.length)
    lines.push(`Ranged weapons: ${rangedWeapons.join(", ")}`);
  return lines.join("\n");
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/embeddings/units/buildUnitEmbeddingText.test.ts
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeddings/units/buildUnitEmbeddingText.ts src/lib/embeddings/units/buildUnitEmbeddingText.test.ts
git commit -m "feat: add shared buildUnitEmbeddingText utility"
```

---

## Task 3: Prisma schema migration — drop Faction enum, add factions table

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_factions_table/migration.sql`

- [ ] **Step 1: Update `prisma/schema.prisma`**

Replace the `Faction` enum and the `Unit` model's `factionId` field. Full diff:

```diff
-enum Faction {
-  SM
-  ORK
-}
-
 enum WeaponType {
   shooting
   melee
 }

+model Faction {
+  id    String @id
+  name  String
+  units Unit[]
+
+  @@map("factions")
+}
+
 model Unit {
   id          String     @id
   name        String
-  factionId   Faction    @map("faction_id")
+  factionId   String     @map("faction_id")
+  faction     Faction    @relation(fields: [factionId], references: [id])
   toughness   Int
   save        Int
   invuln      Int?
   wounds      Int
   keywords    String[]
   embedding   Unsupported("vector(1024)")?
   unitWeapons UnitWeapon[]

   @@map("units")
 }
```

- [ ] **Step 2: Generate a migration shell (create-only so we can edit the SQL)**

```bash
npx prisma migrate dev --create-only --name add_factions_table
```

Expected: Creates `prisma/migrations/<timestamp>_add_factions_table/migration.sql`

- [ ] **Step 3: Replace the generated migration SQL**

Open the generated `migration.sql` and replace its entire content with:

```sql
-- CreateTable
CREATE TABLE "factions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "factions_pkey" PRIMARY KEY ("id")
);

-- Seed existing factions BEFORE adding FK (so existing unit rows don't violate it)
INSERT INTO "factions" ("id", "name") VALUES
    ('SM', 'Space Marines'),
    ('ORK', 'Orks');

-- Convert column type from enum to TEXT (enum values cast to text implicitly)
ALTER TABLE "units" ALTER COLUMN "faction_id" TYPE TEXT USING "faction_id"::TEXT;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_faction_id_fkey"
    FOREIGN KEY ("faction_id") REFERENCES "factions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old enum
DROP TYPE "Faction";
```

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev
```

Expected: Migration applied, Prisma client regenerated. Output ends with `Your database is now in sync with your schema.`

- [ ] **Step 5: Verify Prisma client compiles**

```bash
npx tsc --noEmit
```

Expected: Errors about `Faction` enum imports in `scripts/generate-embeddings/index.ts` and `scripts/import-wahapedia/db.ts`. These will be fixed in later tasks.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: replace Faction enum with factions table"
```

---

## Task 4: Parse `Factions.csv` in Wahapedia import pipeline

**Files:**

- Modify: `scripts/import-wahapedia/parse.ts`

- [ ] **Step 1: Add `FactionRow` type and update `ParsedData`**

In `scripts/import-wahapedia/parse.ts`, add after the `KeywordRow` type (line 31) and update `ParsedData`:

```typescript
export type FactionRow = {
  id: string;
  name: string;
};
```

Update `ParsedData` type:

```typescript
export type ParsedData = {
  datasheets: DatasheetRow[];
  models: ModelRow[];
  wargear: WargearRow[];
  keywords: KeywordRow[];
  factions: FactionRow[];
};
```

- [ ] **Step 2: Update `parseAll` to read `Factions.csv`**

In `parseAll()`, update the parallel reads and return value:

```typescript
export const parseAll = async (): Promise<ParsedData> => {
  const [dsRaw, modRaw, wgRaw, kwRaw, factionsRaw] = await Promise.all([
    readCsv("Datasheets.csv"),
    readCsv("Datasheets_models.csv"),
    readCsv("Datasheets_wargear.csv"),
    readCsv("Datasheets_keywords.csv"),
    readCsv("Factions.csv"),
  ]);

  const datasheets: DatasheetRow[] = dsRaw.map((r) => ({
    id: r["id"],
    name: r["name"],
    faction_id: r["faction_id"],
  }));

  const models: ModelRow[] = modRaw.map((r) => ({
    datasheet_id: r["datasheet_id"],
    line: r["line"],
    name: r["name"],
    T: r["T"],
    Sv: r["Sv"],
    inv_sv: r["inv_sv"],
    W: r["W"],
  }));

  const wargear: WargearRow[] = wgRaw.map((r) => ({
    datasheet_id: r["datasheet_id"],
    line: r["line"],
    name: r["name"],
    description: r["description"],
    type: r["type"],
    A: r["A"],
    BS_WS: r["BS_WS"],
    S: r["S"],
    AP: r["AP"],
    D: r["D"],
  }));

  const keywords: KeywordRow[] = kwRaw.map((r) => ({
    datasheet_id: r["datasheet_id"],
    keyword: r["keyword"],
  }));

  const factions: FactionRow[] = factionsRaw.map((r) => ({
    id: r["id"],
    name: r["name"],
  }));

  return { datasheets, models, wargear, keywords, factions };
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: `TransformResult` type error since `transform()` doesn't return `factions` yet — fix in next task.

- [ ] **Step 4: Commit**

```bash
git add scripts/import-wahapedia/parse.ts
git commit -m "feat: parse Factions.csv in Wahapedia import pipeline"
```

---

## Task 5: Include factions in `TransformResult`

**Files:**

- Modify: `scripts/import-wahapedia/transform.ts`

- [ ] **Step 1: Update `TransformResult` type and `transform()` return value**

In `transform.ts`, update the `TransformResult` type:

```typescript
export type TransformResult = {
  units: UnitWithFaction[];
  warnings: WeaponWarning[];
  countByFaction: Map<string, number>;
  factions: Array<{ id: string; name: string }>;
};
```

At the end of the `transform()` function, before `return`, add:

```typescript
// Collect factions for units that were actually imported (filtered by factions arg)
const usedFactionIds = new Set(units.map((u) => u.factionId));
const factionsResult = data.factions
  .filter((f) => usedFactionIds.has(f.id))
  .map((f) => ({ id: f.id, name: f.name }));

return { units, warnings, countByFaction, factions: factionsResult };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: Errors in `scripts/import-wahapedia/db.ts` and `scripts/import-wahapedia/index.ts` about Faction enum — these are fixed in the next task.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-wahapedia/transform.ts
git commit -m "feat: include faction records in TransformResult"
```

---

## Task 6: Update Wahapedia import DB module — upsert factions, remove enum

**Files:**

- Modify: `scripts/import-wahapedia/db.ts`
- Modify: `scripts/import-wahapedia/index.ts`

- [ ] **Step 1: Rewrite `scripts/import-wahapedia/db.ts`**

Replace the full file content:

```typescript
import { PrismaClient, WeaponType } from "@prisma/client";
import type { UnitWithFaction } from "./transform";

const prisma = new PrismaClient();

export const upsertAll = async (
  units: UnitWithFaction[],
  factions: Array<{ id: string; name: string }>,
): Promise<void> => {
  const weaponMap = new Map<
    string,
    { weapon: UnitWithFaction["shootingWeapons"][0]; wtype: WeaponType }
  >();
  for (const unit of units) {
    for (const w of unit.shootingWeapons) {
      weaponMap.set(w.id, { weapon: w, wtype: WeaponType.shooting });
    }
    for (const w of unit.meleeWeapons) {
      weaponMap.set(w.id, { weapon: w, wtype: WeaponType.melee });
    }
  }

  await prisma.$transaction(async (tx) => {
    // 0. Upsert factions first so units FK constraint is satisfied
    for (const faction of factions) {
      await tx.faction.upsert({
        where: { id: faction.id },
        update: { name: faction.name },
        create: { id: faction.id, name: faction.name },
      });
    }

    // 1. Upsert weapons
    for (const { weapon, wtype } of weaponMap.values()) {
      await tx.weapon.upsert({
        where: { id: weapon.id },
        update: {
          name: weapon.name,
          type: wtype,
          attacks: String(weapon.attacks),
          skill: weapon.skill,
          strength: weapon.strength,
          ap: weapon.ap,
          damage: String(weapon.damage),
          abilities: weapon.abilities as object[],
        },
        create: {
          id: weapon.id,
          name: weapon.name,
          type: wtype,
          attacks: String(weapon.attacks),
          skill: weapon.skill,
          strength: weapon.strength,
          ap: weapon.ap,
          damage: String(weapon.damage),
          abilities: weapon.abilities as object[],
        },
      });
    }

    // 2. Upsert units and replace their weapon associations
    for (const unit of units) {
      await tx.unit.upsert({
        where: { id: unit.id },
        update: {
          name: unit.name,
          factionId: unit.factionId,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        },
        create: {
          id: unit.id,
          name: unit.name,
          factionId: unit.factionId,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        },
      });

      await tx.unitWeapon.deleteMany({ where: { unitId: unit.id } });
      const allWeaponIds = [
        ...unit.shootingWeapons.map((w) => w.id),
        ...unit.meleeWeapons.map((w) => w.id),
      ];
      if (allWeaponIds.length > 0) {
        await tx.unitWeapon.createMany({
          data: allWeaponIds.map((weaponId) => ({
            unitId: unit.id,
            weaponId,
          })),
        });
      }
    }
  });

  await prisma.$disconnect();
};
```

- [ ] **Step 2: Update `scripts/import-wahapedia/index.ts` to pass factions**

Update `index.ts` — rename the CLI factions variable to `factions_filter` to avoid clashing with the `factions` field returned by `transform()`, and pass `factions` to `upsertAll`:

```typescript
const { units, warnings, countByFaction, factions } = transform(
  data,
  factions_arg,
);
```

Wait — `factions` would clash with the CLI arg variable. The full updated section in `index.ts`:

```typescript
const factions_filter = (values.factions as string)
  .split(",")
  .map((f) => f.trim().toUpperCase());

console.log(`Importing factions: ${factions_filter.join(", ")}`);

// ... backup code stays unchanged ...

const data = await parseAll();
const { units, warnings, countByFaction, factions } = transform(
  data,
  factions_filter,
);

for (const w of warnings) {
  console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
}

const byFaction = factions_filter
  .map((f) => `${f}: ${countByFaction.get(f) ?? 0}`)
  .join(", ");
console.log(`Importing ${units.length} units (${byFaction}).`);

await upsertAll(units, factions);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (enum-related errors resolved)

- [ ] **Step 4: Run existing tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add scripts/import-wahapedia/db.ts scripts/import-wahapedia/index.ts
git commit -m "feat: upsert factions in Wahapedia import, remove Faction enum dependency"
```

---

## Task 7: Create `getAllFactions` DB query

**Files:**

- Create: `src/lib/db/factions.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/db/factions.ts
import { prisma } from ".";

export type FactionRecord = { id: string; name: string };

export const getAllFactions = async (): Promise<FactionRecord[]> =>
  prisma.faction.findMany({ select: { id: true, name: true } });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/factions.ts
git commit -m "feat: add getAllFactions DB query"
```

---

## Task 8: Add faction filter to `searchUnitsByEmbedding`

**Files:**

- Modify: `src/lib/db/units.ts`

- [ ] **Step 1: Update `searchUnitsByEmbedding`**

Replace the function (lines 22–34 in current file):

```typescript
export const searchUnitsByEmbedding = async (
  embedding: number[],
  limit = 1,
  factionId?: string,
): Promise<Array<{ id: string; name: string }>> => {
  const vectorLiteral = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
  if (factionId) {
    return prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name
      FROM units
      WHERE embedding IS NOT NULL AND faction_id = ${factionId}
      ORDER BY embedding <=> ${vectorLiteral}
      LIMIT ${limit}
    `;
  }
  return prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM units
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}
    LIMIT ${limit}
  `;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/units.ts
git commit -m "feat: add optional factionId filter to searchUnitsByEmbedding"
```

---

## Task 9: Update parser — structured embeddings + faction extraction

**Files:**

- Modify: `src/lib/llm/parser.ts`
- Create: `src/lib/llm/parser.test.ts`

- [ ] **Step 1: Write failing tests for `parseContextFromJson` faction fields**

```typescript
// src/lib/llm/parser.test.ts
import { describe, it, expect } from "vitest";
import { parseContextFromJson } from "./parser";

describe("parseContextFromJson", () => {
  const base = {
    attackerName: "Intercessors",
    defenderName: "Boyz",
    attackerCount: 10,
    defenderCount: 20,
    phase: "shooting",
    defenderInCover: false,
    firstFighter: "attacker",
    attackerWeaponNames: [],
    defenderWeaponNames: [],
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

```bash
npx vitest run src/lib/llm/parser.test.ts
```

Expected: FAIL — `result.attackerFactionId` is undefined even when present (field not parsed yet)

- [ ] **Step 3: Update `ParsedContext` type and add imports**

At the top of `src/lib/llm/parser.ts`, update imports (add `getAllFactions` and `FactionRecord`, and `buildUnitEmbeddingText`):

```typescript
import { getUnit, searchUnitsByEmbedding } from "@/lib/db/units";
import { getAllFactions } from "@/lib/db/factions";
import type { FactionRecord } from "@/lib/db/factions";
import { embedText } from "@/lib/embeddings/common/voyage";
import { buildUnitEmbeddingText } from "@/lib/embeddings/units/buildUnitEmbeddingText";
```

Update `ParsedContext` type:

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
  attackerFactionId?: string;
  defenderFactionId?: string;
};
```

- [ ] **Step 4: Update `parseContextFromJson` to parse faction fields**

In `parseContextFromJson`, add these two lines to the returned object (after `defenderWeaponNames`):

```typescript
    attackerFactionId:
      typeof parsed.attackerFactionId === "string"
        ? parsed.attackerFactionId
        : undefined,
    defenderFactionId:
      typeof parsed.defenderFactionId === "string"
        ? parsed.defenderFactionId
        : undefined,
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/llm/parser.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 6: Update `extractContext` to accept factions and extract them**

Change the function signature and system prompt:

```typescript
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
- "attackerWeaponNames": string[] — weapon names mentioned for the attacker (empty array if none)
- "defenderWeaponNames": string[] — weapon names mentioned for the defender (empty array if none)
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
```

- [ ] **Step 7: Update `resolveUnits` to use structured embeddings and faction filter**

Replace the `resolveUnits` function:

```typescript
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
    ...(weaponLabel === "ranged" && ctx.attackerWeaponNames.length
      ? { rangedWeapons: ctx.attackerWeaponNames }
      : {}),
    ...(weaponLabel === "melee" && ctx.attackerWeaponNames.length
      ? { meleeWeapons: ctx.attackerWeaponNames }
      : {}),
  });

  const defenderText = buildUnitEmbeddingText({
    name: ctx.defenderName,
    faction: getFactionName(ctx.defenderFactionId),
    ...(weaponLabel === "ranged" && ctx.defenderWeaponNames.length
      ? { rangedWeapons: ctx.defenderWeaponNames }
      : {}),
    ...(weaponLabel === "melee" && ctx.defenderWeaponNames.length
      ? { meleeWeapons: ctx.defenderWeaponNames }
      : {}),
  });

  const [attackerEmbedding, defenderEmbedding] = await Promise.all([
    embedText(attackerText),
    embedText(defenderText),
  ]);

  const [attackerMatches, defenderMatches] = await Promise.all([
    searchUnitsByEmbedding(attackerEmbedding, 1, ctx.attackerFactionId),
    searchUnitsByEmbedding(defenderEmbedding, 1, ctx.defenderFactionId),
  ]);

  const [attackerUnit, defenderUnit] = await Promise.all([
    attackerMatches[0] ? getUnit(attackerMatches[0].id) : null,
    defenderMatches[0] ? getUnit(defenderMatches[0].id) : null,
  ]);

  return { attackerUnit, defenderUnit };
};
```

- [ ] **Step 8: Update `parsePrompt` to fetch factions and thread them through**

Replace the `parsePrompt` function:

```typescript
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

- [ ] **Step 9: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 10: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 11: Commit**

```bash
git add src/lib/llm/parser.ts src/lib/llm/parser.test.ts src/lib/db/factions.ts
git commit -m "feat: extend parser with structured embeddings and faction extraction"
```

---

## Task 10: Update generate-embeddings script to use shared utility

**Files:**

- Modify: `scripts/generate-embeddings/index.ts`

- [ ] **Step 1: Rewrite `scripts/generate-embeddings/index.ts`**

Replace the full file:

```typescript
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const BATCH_SIZE = 128;

const main = async () => {
  const { embedTexts } = await import("../../src/lib/embeddings/common/voyage");
  const { buildUnitEmbeddingText } =
    await import("../../src/lib/embeddings/units/buildUnitEmbeddingText");

  const { values } = (await import("node:util")).parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: {
        type: "string",
        default: "SM,ORK",
      },
    },
  });

  const factionFilter = (values.factions as string)
    .split(",")
    .map((f) => f.trim());

  // Fetch faction name lookup from DB
  const factionRows = await prisma.faction.findMany({
    select: { id: true, name: true },
  });
  const factionNameById = new Map(factionRows.map((f) => [f.id, f.name]));

  const units = await prisma.unit.findMany({
    where: { factionId: { in: factionFilter } },
    include: { unitWeapons: { include: { weapon: true } } },
  });

  console.log(`Generating embeddings for ${units.length} units...`);

  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);
    const texts = batch.map((u) =>
      buildUnitEmbeddingText({
        name: u.name,
        faction: factionNameById.get(u.factionId),
        meleeWeapons: u.unitWeapons
          .filter((uw) => uw.weapon.type === "melee")
          .map((uw) => uw.weapon.name),
        rangedWeapons: u.unitWeapons
          .filter((uw) => uw.weapon.type === "shooting")
          .map((uw) => uw.weapon.name),
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-embeddings/index.ts
git commit -m "feat: update generate-embeddings to use shared buildUnitEmbeddingText"
```

---

## Task 11: Re-populate DB and regenerate embeddings

- [ ] **Step 1: Run the Wahapedia import to populate factions table**

```bash
npm run import-wahapedia
```

Expected: output includes faction upserts, no errors. Factions table now has rows with full names.

- [ ] **Step 2: Regenerate all unit embeddings**

```bash
npm run generate-embeddings
```

Expected: `Generating embeddings for N units...` followed by batch progress, ending with `All embeddings generated.`

- [ ] **Step 3: Verify the embeddings look correct (spot-check)**

```bash
psql $DATABASE_URL -c "SELECT id, name, faction_id FROM units WHERE embedding IS NOT NULL LIMIT 5;"
```

Expected: 5 rows returned with non-null embedding column (shown as vector data)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: regenerate unit embeddings with structured format"
```
