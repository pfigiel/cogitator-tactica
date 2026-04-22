# Postgres Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `src/data/units.ts` file with a Postgres database backed by Prisma, with a normalized units/weapons schema and an updated import pipeline that writes directly to the DB.

**Architecture:** Three Postgres tables (`units`, `weapons`, `unit_weapons`) accessed via Prisma ORM. The import script upserts data directly instead of generating a TypeScript file. The app reads units via thin query functions in `src/lib/db/` that map Prisma output to domain types. Prisma types use a `Db` prefix to stay distinct from domain types.

**Tech Stack:** Postgres 17, Prisma ORM, pgvector extension (column added, not yet populated), Docker Compose for local dev, tsx for running scripts.

---

## File Map

**Created:**

- `docker-compose.yml` — Postgres service for local dev
- `.env.example` — committed placeholder for `DATABASE_URL`
- `prisma/schema.prisma` — Prisma schema (units, weapons, unit_weapons, pgvector)
- `scripts/import-wahapedia/transform.test.ts` — tests for weapon ID derivation
- `scripts/import-wahapedia/db.ts` — DB upsert logic for the import script
- `src/lib/db/index.ts` — Prisma client singleton
- `src/lib/db/types.ts` — `DbUnit`, `DbWeapon`, `DbUnitWithWeapons` types + mapping functions
- `src/lib/db/units.ts` — `listUnits()` and `getUnit()` query functions

**Modified:**

- `src/lib/calculator/types.ts` — add `id: string` to `WeaponProfile`
- `src/lib/calculator/simulation/pipeline.test.ts` — add `id` to weapon fixtures
- `src/lib/calculator/simulation/runner.test.ts` — add `id` to weapon fixtures
- `scripts/import-wahapedia/transform.ts` — export `deriveWeaponId`, add `UnitWithFaction`, assign weapon IDs, include `factionId` in output
- `scripts/import-wahapedia/index.ts` — add pg_dump backup step, call `upsertAll`, remove `generateUnitsFile`
- `src/lib/llm/parser.ts` — replace static `UNITS`/`UNIT_LIST` imports with DB queries
- `.gitignore` — add `.env`

**Deleted:**

- `scripts/import-wahapedia/generate.ts`
- `src/data/units.ts`

---

## Task 1: Local dev infrastructure

**Files:**

- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: cogitator_tactica
      POSTGRES_PASSWORD: cogitator_tactica
      POSTGRES_DB: cogitator_tactica
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 2: Create .env.example**

```
DATABASE_URL="postgresql://cogitator_tactica:cogitator_tactica@localhost:5432/cogitator_tactica"
```

- [ ] **Step 3: Add .env to .gitignore**

Append to the end of `.gitignore` (or create it if absent):

```
.env
backups/
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "chore: add docker-compose and env config for postgres"
```

---

## Task 2: Install Prisma and write schema

**Files:**

- Create: `prisma/schema.prisma`

- [ ] **Step 1: Install Prisma**

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` and `prisma/` directory created. A `.env` file may also be created — delete it (we use `.env.example` only; developers copy it themselves).

- [ ] **Step 2: Write prisma/schema.prisma**

Replace the generated contents entirely:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

enum Faction {
  SM
  ORK
}

enum WeaponType {
  shooting
  melee
}

model Unit {
  id          String     @id
  name        String
  factionId   Faction    @map("faction_id")
  toughness   Int
  save        Int
  invuln      Int?
  wounds      Int
  keywords    String[]
  embedding   Unsupported("vector(1536)")?
  unitWeapons UnitWeapon[]

  @@map("units")
}

model Weapon {
  id          String     @id
  name        String
  type        WeaponType
  attacks     String
  skill       Int
  strength    Int
  ap          Int
  damage      String
  abilities   Json

  unitWeapons UnitWeapon[]

  @@unique([name, type, attacks, skill, strength, ap, damage])
  @@map("weapons")
}

model UnitWeapon {
  unitId   String @map("unit_id")
  weaponId String @map("weapon_id")

  unit   Unit   @relation(fields: [unitId], references: [id])
  weapon Weapon @relation(fields: [weaponId], references: [id])

  @@id([unitId, weaponId])
  @@map("unit_weapons")
}
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "chore: add prisma with postgres schema"
```

---

## Task 3: Run initial migration

**Prerequisites:** Docker running, `.env` copied from `.env.example`.

- [ ] **Step 1: Start Postgres**

```bash
docker compose up -d
```

Expected: container `cogitator-tactica-postgres-1` (or similar) in running state.

- [ ] **Step 2: Copy env and verify**

```bash
cp .env.example .env
```

The `.env` file already has correct credentials matching docker-compose.

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected output includes:

```
Your database is now in sync with your schema.
Generated Prisma Client
```

- [ ] **Step 4: Verify tables exist**

```bash
npx prisma studio
```

Open the browser tab. Confirm `Unit`, `Weapon`, and `UnitWeapon` models appear with no rows. Close studio (`Ctrl+C`).

- [ ] **Step 5: Commit migration**

```bash
git add prisma/migrations/ prisma/schema.prisma
git commit -m "chore: add initial prisma migration"
```

---

## Task 4: Add `id` to WeaponProfile and fix test fixtures

**Files:**

- Modify: `src/lib/calculator/types.ts`
- Modify: `src/lib/calculator/simulation/pipeline.test.ts`
- Modify: `src/lib/calculator/simulation/runner.test.ts`

- [ ] **Step 1: Add `id` to WeaponProfile in types.ts**

In `src/lib/calculator/types.ts`, find the `WeaponProfile` type and add `id` as the first field:

```typescript
export type WeaponProfile = {
  id: string;
  name: string;
  attacks: DiceExpression;
  skill: number;
  strength: number;
  ap: number;
  damage: DiceExpression;
  abilities: WeaponAbility[];
};
```

- [ ] **Step 2: Add `id` to basicWeapon in pipeline.test.ts**

In `src/lib/calculator/simulation/pipeline.test.ts`, update the `basicWeapon` fixture:

```typescript
const basicWeapon: WeaponProfile = {
  id: "bolter",
  name: "Bolter",
  attacks: 1,
  skill: 3,
  strength: 4,
  ap: 0,
  damage: 1,
  abilities: [],
};
```

All weapon objects that spread `basicWeapon` (e.g. `{ ...basicWeapon, ap: 3 }`) inherit the `id` automatically.

The inline weapon fixtures that do NOT spread `basicWeapon` also need `id`. Update each one:

```typescript
// torrent weapon (line ~63):
const torrent: WeaponProfile = {
  id: "torrent_bolter",
  ...basicWeapon,
  attacks: 3,
  ap: 3,
  abilities: [{ type: "TORRENT" }],
};

// lethalWeapon (line ~81):
const lethalWeapon: WeaponProfile = {
  id: "lethal_bolter",
  ...basicWeapon,
  attacks: 2,
  strength: 1,
  ap: 3,
  abilities: [{ type: "LETHAL_HITS" }],
};

// devastatingWeapon (line ~98):
const devastatingWeapon: WeaponProfile = {
  id: "devastating_bolter",
  ...basicWeapon,
  attacks: 2,
  abilities: [{ type: "DEVASTATING_WOUNDS" }],
};

// antiWeapon (line ~174):
const antiWeapon: WeaponProfile = {
  id: "anti_bolter",
  ...basicWeapon,
  attacks: 2,
  strength: 4,
  ap: 0,
  abilities: [
    { type: "ANTI", keyword: "VEHICLE", threshold: 4 },
    { type: "DEVASTATING_WOUNDS" },
  ],
};
```

- [ ] **Step 3: Add `id` to bolter in runner.test.ts**

In `src/lib/calculator/simulation/runner.test.ts`, update the `bolter` fixture:

```typescript
const bolter: WeaponProfile = {
  id: "bolter",
  name: "Bolter",
  attacks: 1,
  skill: 3,
  strength: 4,
  ap: 3,
  damage: 1,
  abilities: [],
};
```

- [ ] **Step 4: Run tests to confirm they still pass**

```bash
npm test
```

Expected: all tests pass. TypeScript errors would surface here if any fixture was missed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator/types.ts src/lib/calculator/simulation/pipeline.test.ts src/lib/calculator/simulation/runner.test.ts
git commit -m "feat: add id field to WeaponProfile"
```

---

## Task 5: Weapon ID derivation (TDD)

**Files:**

- Create: `scripts/import-wahapedia/transform.test.ts`
- Modify: `scripts/import-wahapedia/transform.ts`

The `deriveWeaponId` function maps `(name, fingerprint)` to a stable slug ID. Same name + same stats → same ID. Same name + different stats → base slug for the first, `base_XXXXXX` (6-char hex hash) for subsequent collisions.

- [ ] **Step 1: Write the failing tests**

Create `scripts/import-wahapedia/transform.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { deriveWeaponId } from "./transform";

describe("deriveWeaponId", () => {
  it("returns slug of name for the first occurrence", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    expect(
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId),
    ).toBe("bolt_rifle");
  });

  it("returns the same id when the same fingerprint is seen again (deduplication)", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp = "ranged|2|3|4|0|1";
    deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId);
    expect(deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId)).toBe(
      "bolt_rifle",
    );
  });

  it("appends a 6-char hex hash when same name has different stats", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp1 = "ranged|2|3|4|0|1";
    const fp2 = "ranged|2|3|4|1|1"; // AP differs
    const id1 = deriveWeaponId("Bolt Rifle", fp1, slugToFp, fpToId);
    const id2 = deriveWeaponId("Bolt Rifle", fp2, slugToFp, fpToId);
    expect(id1).toBe("bolt_rifle");
    expect(id2).toMatch(/^bolt_rifle_[a-f0-9]{6}$/);
    expect(id1).not.toBe(id2);
  });

  it("is deterministic: same fingerprint always produces the same suffixed id", () => {
    const run = () => {
      const slugToFp = new Map<string, string>();
      const fpToId = new Map<string, string>();
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId);
      return deriveWeaponId("Bolt Rifle", "ranged|2|3|4|1|1", slugToFp, fpToId);
    };
    expect(run()).toBe(run());
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- transform.test
```

Expected: FAIL — `deriveWeaponId is not a function` (it doesn't exist yet).

- [ ] **Step 3: Implement deriveWeaponId in transform.ts**

Add to the top of `scripts/import-wahapedia/transform.ts`, after the existing imports:

```typescript
import { createHash } from "node:crypto";
```

Add these two exported functions after the existing `slugify` function:

```typescript
export const deriveWeaponId = (
  name: string,
  fingerprint: string,
  slugToFp: Map<string, string>,
  fpToId: Map<string, string>,
): string => {
  if (fpToId.has(fingerprint)) return fpToId.get(fingerprint)!;

  const base = slugify(name);

  let id: string;
  if (!slugToFp.has(base)) {
    slugToFp.set(base, fingerprint);
    id = base;
  } else if (slugToFp.get(base) === fingerprint) {
    id = base;
  } else {
    const hash = createHash("sha256")
      .update(fingerprint)
      .digest("hex")
      .slice(0, 6);
    id = `${base}_${hash}`;
  }

  fpToId.set(fingerprint, id);
  return id;
};

export const weaponFingerprint = (
  type: string,
  attacks: string | number,
  skill: number,
  strength: number,
  ap: number,
  damage: string | number,
): string => `${type}|${attacks}|${skill}|${strength}|${ap}|${damage}`;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- transform.test
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-wahapedia/transform.ts scripts/import-wahapedia/transform.test.ts
git commit -m "feat: add weapon ID derivation to import transform"
```

---

## Task 6: Update transform output to include weapon IDs and factionId

**Files:**

- Modify: `scripts/import-wahapedia/transform.ts`

- [ ] **Step 1: Add UnitWithFaction type**

In `scripts/import-wahapedia/transform.ts`, after the existing imports, add:

```typescript
export type UnitWithFaction = UnitProfile & { factionId: string };
```

Update the `TransformResult` type (already in the file) to use `UnitWithFaction[]`:

```typescript
type TransformResult = {
  units: UnitWithFaction[];
  warnings: WeaponWarning[];
  skippedKillTeam: number;
  countByFaction: Map<string, number>;
};
```

- [ ] **Step 2: Initialize ID maps at the top of the transform function**

Inside the `transform` function, before the main unit-processing loop, add:

```typescript
const slugToFp = new Map<string, string>();
const fpToId = new Map<string, string>();
```

- [ ] **Step 3: Assign weapon IDs when building weapons**

In the weapon-building loop inside `transform` (where `buildWeapon` is called), replace the existing push logic:

```typescript
for (const wgRow of wargearRows) {
  const weaponData = buildWeapon(wgRow, unitName, warnings);
  if (!weaponData) continue;

  const wtype = wgRow.type.toLowerCase() === "ranged" ? "shooting" : "melee";
  const fp = weaponFingerprint(
    wtype,
    weaponData.attacks,
    weaponData.skill,
    weaponData.strength,
    weaponData.ap,
    weaponData.damage,
  );
  const id = deriveWeaponId(weaponData.name, fp, slugToFp, fpToId);
  const weapon: WeaponProfile = { id, ...weaponData };

  if (wtype === "shooting") {
    shootingWeapons.push(weapon);
  } else {
    meleeWeapons.push(weapon);
  }
}
```

- [ ] **Step 4: Add factionId when constructing each unit**

Where `const unit: UnitProfile = { ... }` is constructed inside the transform loop, change the type and add `factionId`:

```typescript
const unit: UnitWithFaction = {
  id: unitId,
  name: unitName,
  toughness,
  save,
  ...(invuln !== undefined && { invuln }),
  wounds,
  keywords,
  shootingWeapons,
  meleeWeapons,
  factionId: sheet.faction_id,
};
```

- [ ] **Step 5: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass. The transform changes don't affect calculator tests (those use fixture objects directly).

- [ ] **Step 6: Commit**

```bash
git add scripts/import-wahapedia/transform.ts
git commit -m "feat: include weapon ids and factionId in import transform output"
```

---

## Task 7: Import script DB upsert (scripts/import-wahapedia/db.ts)

**Files:**

- Create: `scripts/import-wahapedia/db.ts`

- [ ] **Step 1: Create scripts/import-wahapedia/db.ts**

```typescript
import { PrismaClient, Faction, WeaponType } from "@prisma/client";
import type { UnitWithFaction } from "./transform";

const prisma = new PrismaClient();

export const upsertAll = async (units: UnitWithFaction[]): Promise<void> => {
  // Collect all unique weapons across all units (deduplicated by id)
  const weaponMap = new Map<
    string,
    {
      unit: UnitWithFaction;
      weapon: UnitWithFaction["shootingWeapons"][0];
      wtype: WeaponType;
    }
  >();
  for (const unit of units) {
    for (const w of unit.shootingWeapons) {
      weaponMap.set(w.id, { unit, weapon: w, wtype: WeaponType.shooting });
    }
    for (const w of unit.meleeWeapons) {
      weaponMap.set(w.id, { unit, weapon: w, wtype: WeaponType.melee });
    }
  }

  await prisma.$transaction(async (tx) => {
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
          factionId: unit.factionId as Faction,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        },
        create: {
          id: unit.id,
          name: unit.name,
          factionId: unit.factionId as Faction,
          toughness: unit.toughness,
          save: unit.save,
          invuln: unit.invuln ?? null,
          wounds: unit.wounds,
          keywords: unit.keywords,
        },
      });

      // Replace weapon associations so removals are handled
      await tx.unitWeapon.deleteMany({ where: { unitId: unit.id } });
      const allWeaponIds = [
        ...unit.shootingWeapons.map((w) => w.id),
        ...unit.meleeWeapons.map((w) => w.id),
      ];
      if (allWeaponIds.length > 0) {
        await tx.unitWeapon.createMany({
          data: allWeaponIds.map((weaponId) => ({ unitId: unit.id, weaponId })),
        });
      }
    }
  });

  await prisma.$disconnect();
};
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-wahapedia/db.ts
git commit -m "feat: add db upsert logic for import script"
```

---

## Task 8: Update index.ts, add pg_dump, remove generate.ts

**Files:**

- Modify: `scripts/import-wahapedia/index.ts`
- Delete: `scripts/import-wahapedia/generate.ts`

- [ ] **Step 1: Rewrite scripts/import-wahapedia/index.ts**

```typescript
import { parseArgs } from "node:util";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseAll } from "./parse";
import { transform } from "./transform";
import { upsertAll } from "./db";

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: { type: "string", default: "SM,ORK" },
    },
  });

  const factions = (values.factions as string)
    .split(",")
    .map((f) => f.trim().toUpperCase());

  console.log(`Importing factions: ${factions.join(", ")}`);

  // Backup current DB before making changes
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(process.cwd(), "backups");
  const backupPath = join(backupDir, `${timestamp}.dump`);
  mkdirSync(backupDir, { recursive: true });

  console.log(`Backing up database to backups/${timestamp}.dump ...`);
  execSync(`pg_dump "${databaseUrl}" -Fc -f "${backupPath}"`, {
    stdio: "inherit",
  });
  console.log("Backup complete.");

  const data = await parseAll();
  const { units, warnings, skippedKillTeam, countByFaction } = transform(
    data,
    factions,
  );

  for (const w of warnings) {
    console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
  }

  const byFaction = factions
    .map((f) => `${f}: ${countByFaction.get(f) ?? 0}`)
    .join(", ");
  console.log(
    `Importing ${units.length} units (${byFaction}). Skipped ${skippedKillTeam} (Kill Team).`,
  );

  await upsertAll(units);
  console.log("Done.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Delete generate.ts**

```bash
rm scripts/import-wahapedia/generate.ts
```

- [ ] **Step 3: Commit**

```bash
git add scripts/import-wahapedia/index.ts
git rm scripts/import-wahapedia/generate.ts
git commit -m "feat: update import script to upsert to db with pg_dump backup"
```

---

## Task 9: src/lib/db/ — Prisma client, types, and query functions

**Files:**

- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/types.ts`
- Create: `src/lib/db/units.ts`

- [ ] **Step 1: Create src/lib/db/index.ts (Prisma singleton)**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Create src/lib/db/types.ts**

```typescript
import { Prisma } from "@prisma/client";
import type {
  UnitProfile,
  WeaponProfile,
  DiceExpression,
  WeaponAbility,
} from "@/lib/calculator/types";

export type DbUnit = Prisma.UnitGetPayload<Record<string, never>>;
export type DbWeapon = Prisma.WeaponGetPayload<Record<string, never>>;
export type DbUnitWithWeapons = Prisma.UnitGetPayload<{
  include: { unitWeapons: { include: { weapon: true } } };
}>;

const parseDiceExpr = (s: string): DiceExpression => {
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};

export const toWeaponProfile = (db: DbWeapon): WeaponProfile => ({
  id: db.id,
  name: db.name,
  attacks: parseDiceExpr(db.attacks),
  skill: db.skill,
  strength: db.strength,
  ap: db.ap,
  damage: parseDiceExpr(db.damage),
  abilities: db.abilities as WeaponAbility[],
});

export const toUnitProfile = (db: DbUnitWithWeapons): UnitProfile => ({
  id: db.id,
  name: db.name,
  toughness: db.toughness,
  save: db.save,
  ...(db.invuln !== null && { invuln: db.invuln }),
  wounds: db.wounds,
  keywords: db.keywords,
  shootingWeapons: db.unitWeapons
    .filter((uw) => uw.weapon.type === "shooting")
    .map((uw) => toWeaponProfile(uw.weapon)),
  meleeWeapons: db.unitWeapons
    .filter((uw) => uw.weapon.type === "melee")
    .map((uw) => toWeaponProfile(uw.weapon)),
});
```

- [ ] **Step 3: Create src/lib/db/units.ts**

```typescript
import { prisma } from ".";
import { toUnitProfile } from "./types";
import type { UnitProfile } from "@/lib/calculator/types";

export const listUnits = async (): Promise<
  Array<{ id: string; name: string }>
> =>
  prisma.unit.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

export const getUnit = async (id: string): Promise<UnitProfile | null> => {
  const db = await prisma.unit.findUnique({
    where: { id },
    include: { unitWeapons: { include: { weapon: true } } },
  });
  return db ? toUnitProfile(db) : null;
};
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/
git commit -m "feat: add db client, types, and unit query functions"
```

---

## Task 10: Update parser.ts to use DB queries

**Files:**

- Modify: `src/lib/llm/parser.ts`

- [ ] **Step 1: Replace static imports with DB query imports**

At the top of `src/lib/llm/parser.ts`, remove:

```typescript
import { UNIT_LIST, UNITS } from "@/data/units";
```

Add:

```typescript
import { listUnits, getUnit } from "@/lib/db/units";
```

- [ ] **Step 2: Move UNIT_NAME_LIST inside the function**

`UNIT_NAME_LIST` is currently computed at module level. It must move inside `parsePrompt` (or the inner function that calls the LLM) since it now requires an async DB call.

Find where `UNIT_NAME_LIST` is defined (currently at module scope) and remove it. Then, inside `resolveUnitsAndContext` (or whichever function builds the system prompt), add:

```typescript
const unitList = await listUnits();
const UNIT_NAME_LIST = unitList
  .map((u) => ` - id: "${u.id}", name: "${u.name}"`)
  .join("\n");
```

Make `resolveUnitsAndContext` async if it isn't already, and update its call sites accordingly.

- [ ] **Step 3: Replace UNITS[id] lookups with getUnit()**

Find all uses of `UNITS[attackerUnitId]` and `UNITS[defenderUnitId]` (and any other `UNITS[...]` calls). Replace each with:

```typescript
const attackerUnit = await getUnit(attackerUnitId);
const defenderUnit = defenderUnitId ? await getUnit(defenderUnitId) : undefined;
```

These lookups are inside `parsePrompt` which is already `async`, so `await` is safe.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/parser.ts
git commit -m "feat: replace static unit data with db queries in llm parser"
```

---

## Task 11: Delete src/data/units.ts and verify end-to-end

**Files:**

- Delete: `src/data/units.ts`

- [ ] **Step 1: Delete src/data/units.ts**

```bash
rm src/data/units.ts
```

- [ ] **Step 2: Check for any remaining imports of the old file**

```bash
grep -r "data/units" src/
```

Expected: no output. If any imports remain, update them.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run the import script**

Ensure `DATABASE_URL` is set in `.env` and Postgres is running, then:

```bash
npm run import-units
```

Expected output:

```
Backing up database to backups/<timestamp>.dump ...
Backup complete.
Importing factions: SM, ORK
Imported N units (...). Skipped M (Kill Team).
Done.
```

- [ ] **Step 6: Verify data in DB**

```bash
npx prisma studio
```

Open the browser tab. Confirm:

- `Unit` model shows rows with correct stats
- `Weapon` model shows rows with generated IDs (slugs)
- `UnitWeapon` model shows join rows linking units to weapons

- [ ] **Step 7: Start the dev server and confirm the app loads**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm the unit selector populates and combat calculations work. Check the browser console for errors.

- [ ] **Step 8: Commit**

```bash
git rm src/data/units.ts
git commit -m "feat: remove static units file, app now reads from postgres"
```
