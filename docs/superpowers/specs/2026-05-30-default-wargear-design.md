# Default Wargear — Design Spec

**Date:** 2026-05-30  
**Task:** TASK-21

## Problem

Each unit in `Datasheets.csv` has a `loadout` field (HTML) describing the weapons it comes equipped with by default. This data is not imported. When no weapons are specified in a prompt, the calculator falls back to the first weapon in the unit's weapon list, which is arbitrary.

## Goal

1. Import default wargear from `Datasheets.csv` `loadout` field into the database.
2. Use those defaults in the calculator when the user does not specify weapons.

## Data Source

`apps/backend/wahapedia-data/Datasheets.csv` — `loadout` column. Examples:

- `<b>This model is equipped with:</b> kombi-weapon; twin slugga; big choppa.`
- `<b>The Boss Nob is equipped with:</b> slugga; big choppa. <br><br><b>Every Boy is equipped with:</b> slugga; choppa.`
- `<b>Every model is equipped with:</b> bolt pistol; boltgun; close combat weapon.`

Multi-model sheets (e.g., Boyz) produce one unit per model line in the DB, so each model line gets its own default set derived from the corresponding loadout segment.

## Database Change

Add `isDefault Boolean @default(false) @map("is_default")` to `UnitWeapon`:

```prisma
model UnitWeapon {
  unitId    String  @map("unit_id")
  weaponId  String  @map("weapon_id")
  isDefault Boolean @default(false) @map("is_default")
  unit      Unit    @relation(fields: [unitId], references: [id])
  weapon    Weapon  @relation(fields: [weaponId], references: [id])
  @@id([unitId, weaponId])
  @@map("unit_weapons")
}
```

Requires a Prisma migration.

## Type Changes

`common/types.ts` — `UnitProfile` gains:

```ts
defaultShootingWeaponIds: string[];
defaultMeleeWeaponIds: string[];
```

## Seeding Pipeline

### 1. `wahapedia-parser.service.ts`

Add `loadout` to `DatasheetRow`.

New function `parseLoadoutDefaults`:

```
Input:  loadout HTML string, modelNames: string[] (from Datasheets_models)
Output: Map<string, string[]>
        key = normalized model line name, or "__all__" for "this/every model"
        value = array of normalized loadout weapon names
```

Algorithm:

1. Strip `<i>...</i>` blocks (footnotes).
2. Strip all remaining HTML tags.
3. Regex-find all `"X is equipped with: A; B; C."` segments.
4. For each segment:
   - `"This model"` / `"Every model"` → key `"__all__"`
   - `"The/Every [Name]"` / `"[Name]"` → normalize name (lowercase, strip punctuation) → match against `modelNames`
   - Weapons: split by `;`, trim, normalize.

New function to resolve defaults per model line, given its `shootingWeapons` and `meleeWeapons` (already built):

- Candidate pool: weapons whose source wargear row has `line_in_wargear = "1"` (primary profiles only).
- Build a Fuse.js index over candidate weapon names.
- For each loadout weapon name, take `results[0]` — best match, no threshold.
- Return `{ defaultShootingWeaponIds, defaultMeleeWeaponIds }`.

`UnitWithFaction` gains:

```ts
defaultShootingWeaponIds: string[];
defaultMeleeWeaponIds: string[];
```

The `line_in_wargear` value from `WargearRow` must be threaded through to identify primary-profile weapons during default resolution.

### 2. `wahapedia-upsert.service.ts`

`seedUnits` sets `isDefault` when creating `UnitWeapon` records:

```ts
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
```

## Query Layer

### `units.service.ts`

`toUnitProfile()` populates the new fields:

```ts
defaultShootingWeaponIds: db.unitWeapons
  .filter((uw) => uw.weapon.type === "shooting" && uw.isDefault)
  .map((uw) => uw.weapon.id),
defaultMeleeWeaponIds: db.unitWeapons
  .filter((uw) => uw.weapon.type === "melee" && uw.isDefault)
  .map((uw) => uw.weapon.id),
```

## parse-prompt Behavior

`parse-prompt.service.ts` — replace the `defaultAttackerPool[0]` fallback:

```ts
const attackerDefaultIds =
  phase === "shooting"
    ? attackerUnit.defaultShootingWeaponIds
    : attackerUnit.defaultMeleeWeaponIds;

let attackerWeapons: SelectedWeapon[] =
  attackerDefaultIds.length > 0
    ? attackerDefaultIds.map((id) => ({ weaponId: id }))
    : defaultAttackerPool.length > 0
      ? [{ weaponId: defaultAttackerPool[0].id }]
      : [];
```

Same pattern for `defenderWeapons` (always melee phase, use `defaultMeleeWeaponIds`).

## Testing

- `wahapedia-parser.service.spec.ts`: unit tests for `parseLoadoutDefaults` covering simple, multi-model, and multi-profile cases.
- `wahapedia-upsert.service.spec.ts`: verify `isDefault` set correctly on `UnitWeapon` records.
- `units.service.spec.ts`: verify `defaultShootingWeaponIds` / `defaultMeleeWeaponIds` populated from DB.
- `parse-prompt.service.spec.ts`: verify default weapons used when no weapon hints present in prompt.

## Out of Scope

- Frontend changes: WeaponSelector already displays whatever is pre-selected; no UI changes needed.
- Per-model-count defaults: the calculator pre-selects weapons, users adjust counts manually.
