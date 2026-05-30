# Default Wargear Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import default weapon loadouts from Wahapedia CSV data and use them as pre-selected weapons in the calculator when the user doesn't specify weapons.

**Architecture:** Add `isDefault` to the `UnitWeapon` DB join table. Parse the `loadout` HTML field from `Datasheets.csv` to extract default weapon names per model line, fuzzy-match them to actual weapon IDs (primary profiles only), store the flag at seed time, and surface `defaultShootingWeaponIds`/`defaultMeleeWeaponIds` on `UnitProfile` for use in the parse-prompt service and CombatForm phase-change handler.

**Tech Stack:** Prisma (migration), Vitest, Fuse.js (already a dependency), NestJS, Next.js/React.

---

## File Map

| File                                                                    | Change                                                                                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma`                                     | Add `isDefault` to `UnitWeapon`                                                                                                               |
| `apps/backend/src/common/types.ts`                                      | Add two fields to `UnitProfile`                                                                                                               |
| `apps/backend/src/common/test/mocks.ts`                                 | Add new fields to `getMockUnitProfile`                                                                                                        |
| `apps/backend/src/database/test/mocks.ts`                               | Add `isDefault: false` in `getMockDbUnitWithWeapons` entries                                                                                  |
| `apps/backend/src/seeding/wahapedia-parser.service.ts`                  | Add `loadout`/`line_in_wargear` to CSV row types; export `parseLoadoutDefaults` and `resolveDefaultWeaponIds`; populate defaults in transform |
| `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`             | Tests for the two new exported functions                                                                                                      |
| `apps/backend/src/seeding/test/mocks.ts`                                | Add new fields to `getMockUnitWithFaction`                                                                                                    |
| `apps/backend/src/seeding/wahapedia-upsert.service.ts`                  | Pass `isDefault` when building `unitWeaponData`                                                                                               |
| `apps/backend/src/seeding/wahapedia-upsert.service.spec.ts`             | Assert `isDefault` in `unitWeapon.createMany` call                                                                                            |
| `apps/backend/src/units/units.service.ts`                               | Populate `defaultShootingWeaponIds`/`defaultMeleeWeaponIds` in `toUnitProfile`                                                                |
| `apps/backend/src/units/units.service.spec.ts`                          | Assert new fields returned by `getUnit`                                                                                                       |
| `apps/backend/src/parse-prompt/parse-prompt.service.ts`                 | Use default weapon IDs instead of `[0]` fallback                                                                                              |
| `apps/backend/src/parse-prompt/parse-prompt.service.spec.ts`            | Assert all default weapons selected when no hints                                                                                             |
| `apps/web/src/features/calculator/types.ts`                             | Add two fields to frontend `UnitProfile`                                                                                                      |
| `apps/web/src/features/calculator/test/mocks.ts`                        | Add new fields to `getMockUnitProfile`                                                                                                        |
| `apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx` | Use default IDs in `handlePhaseChange`                                                                                                        |

---

### Task 1: Prisma schema + migration

**Files:**

- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Add `isDefault` to `UnitWeapon` model**

In `apps/backend/prisma/schema.prisma`, replace the `UnitWeapon` model:

```prisma
model UnitWeapon {
  unitId    String  @map("unit_id")
  weaponId  String  @map("weapon_id")
  isDefault Boolean @default(false) @map("is_default")

  unit   Unit   @relation(fields: [unitId], references: [id])
  weapon Weapon @relation(fields: [weaponId], references: [id])

  @@id([unitId, weaponId])
  @@map("unit_weapons")
}
```

- [ ] **Step 2: Create and apply migration**

```bash
cd apps/backend && pnpm prisma migrate dev --name add_is_default_to_unit_weapon
```

Expected: new migration directory created under `prisma/migrations/`, DB updated.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "chore: add isDefault to UnitWeapon schema"
```

---

### Task 2: Backend types + mock updates

**Files:**

- Modify: `apps/backend/src/common/types.ts`
- Modify: `apps/backend/src/common/test/mocks.ts`
- Modify: `apps/backend/src/database/test/mocks.ts`

- [ ] **Step 1: Add fields to `UnitProfile` in `apps/backend/src/common/types.ts`**

Find the `UnitProfile` type and add two fields after `meleeWeapons`:

```ts
export type UnitProfile = {
  id: string;
  name: string;
  toughness: number;
  save: number;
  invuln?: number;
  wounds: number;
  keywords: string[];
  shootingWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
  defaultShootingWeaponIds: string[];
  defaultMeleeWeaponIds: string[];
};
```

- [ ] **Step 2: Update `getMockUnitProfile` in `apps/backend/src/common/test/mocks.ts`**

```ts
export const getMockUnitProfile = (
  overrides: Partial<UnitProfile> = {},
): UnitProfile => ({
  id: "unit-id",
  name: "unit-name",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
  defaultShootingWeaponIds: [],
  defaultMeleeWeaponIds: [],
  ...overrides,
});
```

- [ ] **Step 3: Update `getMockDbUnitWithWeapons` in `apps/backend/src/database/test/mocks.ts`**

The `unitWeapons` entries need `isDefault`. The helper only sets `unitWeapons` from overrides, so update it to ensure `isDefault` defaults to `false` in any `unitWeapon` entry. Change:

```ts
export const getMockDbUnitWithWeapons = ({
  unitWeapons,
  ...overrides
}: Partial<DbUnitWithWeapons> = {}): DbUnitWithWeapons => ({
  ...getMockDbUnit(overrides),
  unitWeapons: (unitWeapons ?? []).map((uw) => ({
    isDefault: false,
    ...uw,
  })),
});
```

- [ ] **Step 4: Run backend tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests pass (TypeScript errors would surface if any mock is missing the new field).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/common/types.ts apps/backend/src/common/test/mocks.ts apps/backend/src/database/test/mocks.ts
git commit -m "feat: add defaultShootingWeaponIds and defaultMeleeWeaponIds to UnitProfile"
```

---

### Task 3: Export `parseLoadoutDefaults` — tests then implementation

**Files:**

- Modify: `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`
- Modify: `apps/backend/src/seeding/wahapedia-parser.service.ts`

- [ ] **Step 1: Write failing tests**

Append to `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`:

```ts
import { parseLoadoutDefaults } from "./wahapedia-parser.service";

describe("parseLoadoutDefaults", () => {
  it("should return __all__ key with weapon names when loadout has single-model format", () => {
    const result = parseLoadoutDefaults(
      "<b>This model is equipped with:</b> kombi-weapon; twin slugga; big choppa.",
      ["WARBOSS"],
    );
    expect(result.get("__all__")).toEqual([
      "kombi-weapon",
      "twin slugga",
      "big choppa",
    ]);
  });

  it("should return __all__ key when loadout uses every model format", () => {
    const result = parseLoadoutDefaults(
      "<b>Every model is equipped with:</b> bolt pistol; boltgun; close combat weapon.",
      ["INTERCESSOR"],
    );
    expect(result.get("__all__")).toEqual([
      "bolt pistol",
      "boltgun",
      "close combat weapon",
    ]);
  });

  it("should return per-model keys when loadout has multi-model format", () => {
    const result = parseLoadoutDefaults(
      "<b>The Boss Nob is equipped with:</b> slugga; big choppa. <br><br><b>Every Boy is equipped with:</b> slugga; choppa.",
      ["BOY", "BOSS NOB"],
    );
    expect(result.get("boss nob")).toEqual(["slugga", "big choppa"]);
    expect(result.get("boy")).toEqual(["slugga", "choppa"]);
  });

  it("should return empty map when loadout is empty string", () => {
    const result = parseLoadoutDefaults("", ["MODEL"]);
    expect(result.size).toBe(0);
  });

  it("should strip italic footnotes before parsing weapon names", () => {
    const result = parseLoadoutDefaults(
      "<b>This model is equipped with:</b> bolt pistol; boltgun<i>*</i>; close combat weapon.",
      ["MARINE"],
    );
    expect(result.get("__all__")).toEqual([
      "bolt pistol",
      "boltgun",
      "close combat weapon",
    ]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/backend && pnpm test wahapedia-parser
```

Expected: FAIL — `parseLoadoutDefaults is not exported` or similar.

- [ ] **Step 3: Implement `parseLoadoutDefaults` in `apps/backend/src/seeding/wahapedia-parser.service.ts`**

Add these two helper functions and the export before the `@Injectable()` class declaration:

```ts
const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const parseLoadoutDefaults = (
  loadout: string,
  modelNames: string[],
): Map<string, string[]> => {
  const result = new Map<string, string[]>();
  if (!loadout) return result;

  const stripped = loadout
    .replace(/<i[^>]*>.*?<\/i>/gis, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const segmentRe = /([^.]+?)\s+is equipped with:\s*([^.]+)\./gi;
  let match: RegExpExecArray | null;

  while ((match = segmentRe.exec(stripped)) !== null) {
    const header = match[1].trim();
    const weaponList = match[2].trim();

    const weapons = weaponList
      .split(";")
      .map((w) =>
        w
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9'\- ]+/g, "")
          .trim(),
      )
      .filter(Boolean);

    const key = resolveLoadoutKey(header, modelNames);
    result.set(key, weapons);
  }

  return result;
};

const resolveLoadoutKey = (header: string, modelNames: string[]): string => {
  const norm = normalizeText(header);

  if (/^(this|every( other)?)\s+model$/.test(norm)) return "__all__";

  const stripped = norm.replace(/^the\s+/, "").replace(/^every\s+/, "");

  const normalizedModels = modelNames.map(normalizeText);
  const exact = normalizedModels.find((mn) => mn === stripped);
  return exact ?? stripped;
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/backend && pnpm test wahapedia-parser
```

Expected: all `parseLoadoutDefaults` tests PASS, existing tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-parser.service.ts apps/backend/src/seeding/wahapedia-parser.service.spec.ts
git commit -m "feat: export parseLoadoutDefaults for default wargear extraction"
```

---

### Task 4: Export `resolveDefaultWeaponIds` — tests then implementation

**Files:**

- Modify: `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`
- Modify: `apps/backend/src/seeding/wahapedia-parser.service.ts`

- [ ] **Step 1: Write failing tests**

Append to `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`:

```ts
import { resolveDefaultWeaponIds } from "./wahapedia-parser.service";

describe("resolveDefaultWeaponIds", () => {
  const primaryWeapons = [
    { id: "kombi_weapon", name: "Kombi-weapon", type: "shooting" as const },
    { id: "twin_slugga", name: "Twin slugga", type: "shooting" as const },
    { id: "big_choppa", name: "Big choppa", type: "melee" as const },
    { id: "power_klaw", name: "Power klaw", type: "melee" as const },
  ];

  it("should return shooting and melee default ids when names match weapons by type", () => {
    const result = resolveDefaultWeaponIds(primaryWeapons, [
      "kombi-weapon",
      "twin slugga",
      "big choppa",
    ]);
    expect(result.defaultShootingWeaponIds).toEqual([
      "kombi_weapon",
      "twin_slugga",
    ]);
    expect(result.defaultMeleeWeaponIds).toEqual(["big_choppa"]);
  });

  it("should return empty arrays when defaultNames is empty", () => {
    const result = resolveDefaultWeaponIds(primaryWeapons, []);
    expect(result.defaultShootingWeaponIds).toEqual([]);
    expect(result.defaultMeleeWeaponIds).toEqual([]);
  });

  it("should return empty arrays when primaryWeapons is empty", () => {
    const result = resolveDefaultWeaponIds([], ["kombi-weapon"]);
    expect(result.defaultShootingWeaponIds).toEqual([]);
    expect(result.defaultMeleeWeaponIds).toEqual([]);
  });

  it("should match multi-profile weapon base name to primary profile only when names partially match", () => {
    const weapons = [
      {
        id: "gorks_klaw_strike",
        name: "Gork's Klaw - strike",
        type: "melee" as const,
      },
    ];
    const result = resolveDefaultWeaponIds(weapons, ["gork's klaw"]);
    expect(result.defaultMeleeWeaponIds).toEqual(["gorks_klaw_strike"]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/backend && pnpm test wahapedia-parser
```

Expected: FAIL — `resolveDefaultWeaponIds is not exported`.

- [ ] **Step 3: Implement `resolveDefaultWeaponIds`**

Add this export to `apps/backend/src/seeding/wahapedia-parser.service.ts` (after `parseLoadoutDefaults`):

```ts
export const resolveDefaultWeaponIds = (
  primaryWeapons: Array<{
    id: string;
    name: string;
    type: "shooting" | "melee";
  }>,
  defaultNames: string[],
): { defaultShootingWeaponIds: string[]; defaultMeleeWeaponIds: string[] } => {
  if (primaryWeapons.length === 0 || defaultNames.length === 0) {
    return { defaultShootingWeaponIds: [], defaultMeleeWeaponIds: [] };
  }

  const fuse = new Fuse(primaryWeapons, { keys: ["name"] });
  const defaultShootingWeaponIds: string[] = [];
  const defaultMeleeWeaponIds: string[] = [];

  for (const name of defaultNames) {
    const match = fuse.search(name)[0]?.item;
    if (!match) continue;
    if (match.type === "shooting") defaultShootingWeaponIds.push(match.id);
    else defaultMeleeWeaponIds.push(match.id);
  }

  return { defaultShootingWeaponIds, defaultMeleeWeaponIds };
};
```

Also add the Fuse import at the top of the file (it's already a dependency used in `units.service.ts`):

```ts
import Fuse from "fuse.js";
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/backend && pnpm test wahapedia-parser
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-parser.service.ts apps/backend/src/seeding/wahapedia-parser.service.spec.ts
git commit -m "feat: export resolveDefaultWeaponIds for fuzzy default weapon matching"
```

---

### Task 5: Wire defaults into parser transform

**Files:**

- Modify: `apps/backend/src/seeding/wahapedia-parser.service.ts`
- Modify: `apps/backend/src/seeding/test/mocks.ts`

- [ ] **Step 1: Add `loadout` to `DatasheetRow` and `line_in_wargear` to `WargearRow`**

In the type definitions near the top of `apps/backend/src/seeding/wahapedia-parser.service.ts`:

```ts
type DatasheetRow = {
  id: string;
  name: string;
  faction_id: string;
  loadout: string;
};

type WargearRow = {
  datasheet_id: string;
  line: string;
  line_in_wargear: string;
  name: string;
  description: string;
  range: string;
  type: string;
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
};
```

- [ ] **Step 2: Include `loadout` and `line_in_wargear` in the CSV parsing**

In the `parseAndTransform` (or `parse`) method where data is assembled from raw CSV rows, find the datasheets mapping and add `loadout`:

```ts
datasheets: datasheetRaw.map((r) => ({
  id: r["id"],
  name: r["name"],
  faction_id: r["faction_id"],
  loadout: r["loadout"] ?? "",
})),
```

And the wargear mapping, add `line_in_wargear`:

```ts
wargear: wgRaw.map((r) => ({
  datasheet_id: r["datasheet_id"],
  line: r["line"],
  line_in_wargear: r["line_in_wargear"],
  name: r["name"],
  description: r["description"],
  range: r["range"],
  type: r["type"],
  A: r["A"],
  BS_WS: r["BS_WS"],
  S: r["S"],
  AP: r["AP"],
  D: r["D"],
})),
```

- [ ] **Step 3: Add `defaultShootingWeaponIds` and `defaultMeleeWeaponIds` to `UnitWithFaction`**

Find the `export type UnitWithFaction` declaration and add the two new fields:

```ts
export type UnitWithFaction = UnitProfile & {
  factionId: string;
  defaultShootingWeaponIds: string[];
  defaultMeleeWeaponIds: string[];
};
```

- [ ] **Step 4: Populate defaults in the `transform` loop**

Inside the `transform` method, in the loop over `data.datasheets`, after the `wargearRows` variable is set and before the model line loop:

```ts
const defaultsMap = parseLoadoutDefaults(
  sheet.loadout,
  (modelsBySheet.get(sheet.id) ?? []).map((ml) => ml.name),
);
```

Inside the model line loop, replace the existing `for (const wgRow of wargearRows)` loop with this version that collects primary-profile weapons in the same pass:

```ts
const primaryWeapons: Array<{
  id: string;
  name: string;
  type: "shooting" | "melee";
}> = [];

for (const wgRow of wargearRows) {
  const weaponData = buildWeapon(wgRow, unitName, warnings);
  if (!weaponData) continue;
  const wtype = wgRow.type.toLowerCase() === "ranged" ? "shooting" : "melee";
  const fp = weaponFingerprint(
    weaponData.name,
    wtype,
    weaponData.attacks,
    weaponData.skill,
    weaponData.strength,
    weaponData.ap,
    weaponData.damage,
  );
  const id = deriveWeaponId(weaponData.name, fp, slugToFp, fpToId);
  const weapon: WeaponProfile = { id, ...weaponData };
  if (wtype === "shooting") shootingWeapons.push(weapon);
  else meleeWeapons.push(weapon);

  if (wgRow.line_in_wargear === "1") {
    primaryWeapons.push({ id, name: weaponData.name, type: wtype });
  }
}
```

After that loop:

```ts
const normalizedModelName = normalizeText(modelLine.name);
const defaultNames =
  defaultsMap.get(normalizedModelName) ?? defaultsMap.get("__all__") ?? [];
const { defaultShootingWeaponIds, defaultMeleeWeaponIds } =
  resolveDefaultWeaponIds(primaryWeapons, defaultNames);
```

Then add the two fields to the `units.push({...})` call:

```ts
units.push({
  id: slugify(unitName),
  name: unitName,
  toughness: parseInt(modelLine.T, 10),
  save: parseSave(modelLine.Sv),
  ...(invuln !== undefined ? { invuln } : {}),
  wounds: parseInt(modelLine.W, 10),
  keywords,
  shootingWeapons,
  meleeWeapons,
  factionId: sheet.faction_id,
  defaultShootingWeaponIds,
  defaultMeleeWeaponIds,
});
```

- [ ] **Step 5: Update `getMockUnitWithFaction` in `apps/backend/src/seeding/test/mocks.ts`**

```ts
export const getMockUnitWithFaction = (
  overrides: Partial<UnitWithFaction> = {},
): UnitWithFaction => ({
  id: "intercessors",
  name: "Intercessors",
  factionId: "SM",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["INFANTRY"],
  shootingWeapons: [],
  meleeWeapons: [],
  defaultShootingWeaponIds: [],
  defaultMeleeWeaponIds: [],
  ...overrides,
});
```

- [ ] **Step 6: Run backend tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-parser.service.ts apps/backend/src/seeding/test/mocks.ts
git commit -m "feat: populate defaultShootingWeaponIds and defaultMeleeWeaponIds in parser transform"
```

---

### Task 6: Upsert — write `isDefault` to DB

**Files:**

- Modify: `apps/backend/src/seeding/wahapedia-upsert.service.spec.ts`
- Modify: `apps/backend/src/seeding/wahapedia-upsert.service.ts`

- [ ] **Step 1: Write failing test**

In `apps/backend/src/seeding/wahapedia-upsert.service.spec.ts`, add a new test in the existing `describe` block:

```ts
it("should set isDefault on unit weapon records matching defaultShootingWeaponIds", async () => {
  const weapon = getMockWeaponWithFaction({ id: "bolt_rifle" });
  const unit = getMockUnitWithFaction({
    shootingWeapons: [weapon],
    defaultShootingWeaponIds: ["bolt_rifle"],
  });

  await service.upsertAll([unit], [{ id: "SM", name: "Space Marines" }]);

  expect(prisma.unitWeapon.createMany).toHaveBeenCalledWith({
    data: [{ unitId: "intercessors", weaponId: "bolt_rifle", isDefault: true }],
  });
});
```

Also update the existing test `"should insert factions, weapons, units, and unit weapons when upsertAll is called with a unit with weapons"` — its `unitWeapon.createMany` expectation no longer matches because `isDefault` is now included. Change it to:

```ts
expect(prisma.unitWeapon.createMany).toHaveBeenCalledWith({
  data: [
    expect.objectContaining({ unitId: "intercessors", weaponId: "bolt_rifle" }),
  ],
});
```

- [ ] **Step 2: Run tests to confirm the new test fails**

```bash
cd apps/backend && pnpm test wahapedia-upsert
```

Expected: new test FAIL — `isDefault` missing from createMany call.

- [ ] **Step 3: Update `seedUnits` in `apps/backend/src/seeding/wahapedia-upsert.service.ts`**

Find the `unitWeaponData` array construction and add `isDefault`:

```ts
const unitWeaponData = units.flatMap((unit) => [
  ...unit.shootingWeapons.map((w) => ({
    unitId: unit.id,
    weaponId: w.id,
    isDefault: unit.defaultShootingWeaponIds.includes(w.id),
  })),
  ...unit.meleeWeapons.map((w) => ({
    unitId: unit.id,
    weaponId: w.id,
    isDefault: unit.defaultMeleeWeaponIds.includes(w.id),
  })),
]);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/backend && pnpm test wahapedia-upsert
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-upsert.service.ts apps/backend/src/seeding/wahapedia-upsert.service.spec.ts
git commit -m "feat: persist isDefault flag on unit weapon records"
```

---

### Task 7: Units service — surface default IDs on `UnitProfile`

**Files:**

- Modify: `apps/backend/src/units/units.service.spec.ts`
- Modify: `apps/backend/src/units/units.service.ts`

- [ ] **Step 1: Write failing test**

In `apps/backend/src/units/units.service.spec.ts`, in the `getUnit` describe block, add:

```ts
it("should return defaultShootingWeaponIds and defaultMeleeWeaponIds from isDefault flags", async () => {
  const dbUnit = getMockDbUnitWithWeapons({
    id: "unit-1",
    name: "Intercessors",
    toughness: 4,
    save: 3,
    invuln: null,
    wounds: 2,
    keywords: [],
    factionId: "f1",
    altNames: [],
    unitWeapons: [
      {
        unitId: "unit-1",
        weaponId: "w1",
        isDefault: true,
        weapon: {
          id: "w1",
          name: "Bolt Rifle",
          type: "shooting",
          attacks: "1",
          skill: 3,
          strength: "4",
          ap: -1,
          damage: "1",
          abilities: [],
        },
      },
      {
        unitId: "unit-1",
        weaponId: "w2",
        isDefault: false,
        weapon: {
          id: "w2",
          name: "Close Combat Weapon",
          type: "melee",
          attacks: "2",
          skill: 3,
          strength: "3",
          ap: 0,
          damage: "1",
          abilities: [],
        },
      },
    ],
  });
  prisma.unit.findUnique.mockResolvedValue(dbUnit);

  const result = await service.getUnit("unit-1");

  expect(result?.defaultShootingWeaponIds).toEqual(["w1"]);
  expect(result?.defaultMeleeWeaponIds).toEqual([]);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/backend && pnpm test units.service
```

Expected: FAIL — `defaultShootingWeaponIds` is `undefined`.

- [ ] **Step 3: Update `toUnitProfile` in `apps/backend/src/units/units.service.ts`**

In the `toUnitProfile` private method, add the two new fields to the returned object:

```ts
private toUnitProfile(db: DbUnitWithWeapons | null): UnitProfile | null {
  if (!db) return null;
  return {
    id: db.id,
    name: db.name,
    toughness: db.toughness,
    save: db.save,
    ...(db.invuln !== null ? { invuln: db.invuln } : {}),
    wounds: db.wounds,
    keywords: db.keywords,
    shootingWeapons: db.unitWeapons
      .filter((uw) => uw.weapon.type === "shooting")
      .map((uw) => this.toWeaponProfile(uw.weapon)),
    meleeWeapons: db.unitWeapons
      .filter((uw) => uw.weapon.type === "melee")
      .map((uw) => this.toWeaponProfile(uw.weapon)),
    defaultShootingWeaponIds: db.unitWeapons
      .filter((uw) => uw.weapon.type === "shooting" && uw.isDefault)
      .map((uw) => uw.weapon.id),
    defaultMeleeWeaponIds: db.unitWeapons
      .filter((uw) => uw.weapon.type === "melee" && uw.isDefault)
      .map((uw) => uw.weapon.id),
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/backend && pnpm test units.service
```

Expected: all tests PASS.

- [ ] **Step 5: Update existing `getUnit` test to include new fields in expected result**

The existing test `"should return UnitProfile when unit exists"` will now fail because the result includes `defaultShootingWeaponIds: []` and `defaultMeleeWeaponIds: []` but the expected object doesn't. Update that test's `expect(result).toEqual({...})` to add:

```ts
defaultShootingWeaponIds: [],
defaultMeleeWeaponIds: [],
```

- [ ] **Step 6: Run all backend tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/units/units.service.ts apps/backend/src/units/units.service.spec.ts
git commit -m "feat: include defaultShootingWeaponIds and defaultMeleeWeaponIds in getUnit response"
```

---

### Task 8: parse-prompt — use default weapon IDs

**Files:**

- Modify: `apps/backend/src/parse-prompt/parse-prompt.service.spec.ts`
- Modify: `apps/backend/src/parse-prompt/parse-prompt.service.ts`

- [ ] **Step 1: Write failing test**

In `apps/backend/src/parse-prompt/parse-prompt.service.spec.ts`, in the `parse` describe block, add:

```ts
it("should use defaultShootingWeaponIds as attackerWeapons when no weapon hints are present and unit has defaults", async () => {
  const ctx = getMockParsedContext({ phase: "shooting" });
  const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
  const auxGrenade = getMockWeaponProfile({ id: "w2", name: "Aux Grenade" });
  const attackerUnit = getMockUnitProfile({
    id: "u1",
    shootingWeapons: [boltRifle, auxGrenade],
    defaultShootingWeaponIds: ["w1"],
  });
  const defenderUnit = getMockUnitProfile({
    id: "u2",
    meleeWeapons: [getMockWeaponProfile({ id: "w3" })],
    defaultMeleeWeaponIds: ["w3"],
  });

  contextExtractionService.extract.mockResolvedValue(ctx);
  unitResolutionService.resolve.mockResolvedValue({
    attackerUnit,
    defenderUnit,
  });

  const result = await service.parse("some prompt");

  expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
  expect(result.defenderWeapons).toEqual([{ weaponId: "w3" }]);
});

it("should fall back to first weapon when no weapon hints and no defaults are set", async () => {
  const ctx = getMockParsedContext({ phase: "shooting" });
  const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
  const closeCombat = getMockWeaponProfile({
    id: "w2",
    name: "Close Combat Weapon",
  });
  const attackerUnit = getMockUnitProfile({
    id: "u1",
    shootingWeapons: [boltRifle],
    defaultShootingWeaponIds: [],
  });
  const defenderUnit = getMockUnitProfile({
    id: "u2",
    meleeWeapons: [closeCombat],
    defaultMeleeWeaponIds: [],
  });

  contextExtractionService.extract.mockResolvedValue(ctx);
  unitResolutionService.resolve.mockResolvedValue({
    attackerUnit,
    defenderUnit,
  });

  const result = await service.parse("some prompt");

  expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
  expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
});
```

- [ ] **Step 2: Update existing test that checks default weapons**

The existing test `"should return CombatFormState with default weapons when no weapon hints are present"` expects `attackerWeapons: [{ weaponId: "w1" }]` and `defenderWeapons: [{ weaponId: "w2" }]`. Since `getMockUnitProfile` now has `defaultShootingWeaponIds: []` by default, the fallback logic kicks in and the test still passes. No change needed.

- [ ] **Step 3: Run tests to confirm new tests fail**

```bash
cd apps/backend && pnpm test parse-prompt.service
```

Expected: FAIL — service still uses `[0]` not default IDs.

- [ ] **Step 4: Update `parse-prompt.service.ts`**

Replace the `attackerWeapons` and `defenderWeapons` initialization in `apps/backend/src/parse-prompt/parse-prompt.service.ts`:

```ts
const attackerDefaultIds =
  phase === "shooting"
    ? attackerUnit.defaultShootingWeaponIds
    : attackerUnit.defaultMeleeWeaponIds;
const defenderDefaultIds = defenderUnit.defaultMeleeWeaponIds;

let attackerWeapons: SelectedWeapon[] =
  attackerDefaultIds.length > 0
    ? attackerDefaultIds.map((id) => ({ weaponId: id }))
    : defaultAttackerPool.length > 0
      ? [{ weaponId: defaultAttackerPool[0].id }]
      : [];
let defenderWeapons: SelectedWeapon[] =
  defenderDefaultIds.length > 0
    ? defenderDefaultIds.map((id) => ({ weaponId: id }))
    : defaultDefenderPool.length > 0
      ? [{ weaponId: defaultDefenderPool[0].id }]
      : [];
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd apps/backend && pnpm test parse-prompt.service
```

Expected: all tests PASS.

- [ ] **Step 6: Run all backend tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/parse-prompt/parse-prompt.service.ts apps/backend/src/parse-prompt/parse-prompt.service.spec.ts
git commit -m "feat: use default weapon IDs in parse-prompt fallback selection"
```

---

### Task 9: Frontend — types, mocks, and CombatForm

**Files:**

- Modify: `apps/web/src/features/calculator/types.ts`
- Modify: `apps/web/src/features/calculator/test/mocks.ts`
- Modify: `apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx`

- [ ] **Step 1: Add fields to frontend `UnitProfile` in `apps/web/src/features/calculator/types.ts`**

Find the `UnitProfile` type and add the two new fields after `meleeWeapons`:

```ts
export type UnitProfile = {
  id: string;
  name: string;
  toughness: number;
  save: number;
  invuln?: number;
  wounds: number;
  keywords: string[];
  shootingWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
  defaultShootingWeaponIds: string[];
  defaultMeleeWeaponIds: string[];
};
```

- [ ] **Step 2: Update `getMockUnitProfile` in `apps/web/src/features/calculator/test/mocks.ts`**

```ts
export const getMockUnitProfile = (
  overrides: Partial<UnitProfile> = {},
): UnitProfile => ({
  id: "unit-id",
  name: "unit-name",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
  defaultShootingWeaponIds: [],
  defaultMeleeWeaponIds: [],
  ...overrides,
});
```

- [ ] **Step 3: Run frontend tests to surface any type errors**

```bash
cd apps/web && pnpm test
```

Expected: all tests PASS (type errors would surface if any test file uses `UnitProfile` shape directly).

- [ ] **Step 4: Update `handlePhaseChange` in `apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx`**

Replace the existing `handlePhaseChange` function:

```ts
const handlePhaseChange = (phase: Phase) => {
  const attackerPool = attackerUnit
    ? phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons
    : [];
  const defenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];

  const attackerDefaultIds =
    phase === "shooting"
      ? (attackerUnit?.defaultShootingWeaponIds ?? [])
      : (attackerUnit?.defaultMeleeWeaponIds ?? []);
  const defenderDefaultIds = defenderUnit?.defaultMeleeWeaponIds ?? [];

  onChange({
    ...state,
    phase,
    attackerWeapons:
      attackerDefaultIds.length > 0
        ? attackerDefaultIds.map((id) => ({ weaponId: id }))
        : attackerPool.length > 0
          ? [{ weaponId: attackerPool[0].id }]
          : [],
    defenderWeapons:
      defenderDefaultIds.length > 0
        ? defenderDefaultIds.map((id) => ({ weaponId: id }))
        : defenderPool.length > 0
          ? [{ weaponId: defenderPool[0].id }]
          : [],
  });
};
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS across all workspaces.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/calculator/types.ts apps/web/src/features/calculator/test/mocks.ts apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx
git commit -m "feat: use default weapon IDs in CombatForm phase change handler"
```

---

### Task 10: Re-seed database and verify end-to-end

- [ ] **Step 1: Re-seed the database**

```bash
cd apps/backend && pnpm seed
```

Expected: seed completes without errors. Watch for `[WARN]` lines — acceptable, they indicate unparseable weapon stats.

- [ ] **Step 2: Start the dev servers and verify manually**

Start the backend and frontend dev servers, then open the calculator. Parse a prompt like `"5 Intercessors shoot 10 Boyz"`. Verify:

- The form pre-selects Bolt Rifle (not another weapon) for Intercessors.
- Switch to Melee phase — verify default melee weapon is selected.

- [ ] **Step 3: Final commit if any adjustments were needed**

```bash
git add -A
git commit -m "chore: verify default wargear end-to-end"
```
