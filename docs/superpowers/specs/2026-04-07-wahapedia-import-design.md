# Wahapedia Unit Import — Design Spec

**Date:** 2026-04-07
**Status:** Approved

## Overview

A TypeScript script that reads Wahapedia CSV export files and generates `src/data/units.ts`, replacing the hand-crafted unit roster with data-driven imports. Initially processes Space Marines (`SM`) and Orks (`ORK`); designed to accept any faction via CLI flag.

---

## Type System Changes

### `DiceExpression`

`WeaponProfile.attacks` and `WeaponProfile.damage` change from `number` to:

```ts
export type DiceExpression = number | string;
```

Valid string patterns: `/^(\d+)?D(3|6)([+-]\d+)?$/i` — covers `D6`, `2D6`, `D3`, `D3+3`, `D6+1`. Any other string is invalid.

The calculator pipeline uses a new helper in `dice.ts`:

```ts
export function diceAverage(expr: DiceExpression): number
```

Maps expressions to their expected value (`D6` → `3.5`, `D3` → `2`, `D6+1` → `4.5`, `2D6` → `7`, etc.). Plain numbers pass through unchanged. All pipeline steps call `diceAverage()` before arithmetic — no other pipeline changes required.

Validation of dice strings happens **only in the import script**, not at app runtime. Invalid expressions cause the weapon to be skipped with a console warning.

Existing hand-crafted units keep their plain numbers, which are valid `DiceExpression` values.

### `WeaponAbility` — HAZARDOUS addition

`HAZARDOUS` is added to the `WeaponAbility` union (no calculator effect — recognized and stored only):

```ts
| { type: "HAZARDOUS" }
```

---

## Script Structure

```
scripts/import-wahapedia/
  index.ts      ← entry point; parses CLI args, orchestrates pipeline, writes units.ts
  parse.ts      ← reads CSV files into typed row objects (no business logic)
  transform.ts  ← joins rows across CSVs → UnitProfile[]
  abilities.ts  ← lookup table: ability string token → WeaponAbility
  generate.ts   ← UnitProfile[] → units.ts source string
```

Run via:
```bash
npx tsx scripts/import-wahapedia/index.ts --factions SM,ORK
```

`package.json` gets an `"import-units"` convenience script:
```json
"import-units": "tsx scripts/import-wahapedia/index.ts --factions SM,ORK"
```

---

## Data Flow

### CSV files used

| File | Provides |
|---|---|
| `Datasheets.csv` | unit id, name, faction_id |
| `Datasheets_models.csv` | T, Sv, inv_sv, W — one row per model profile |
| `Datasheets_wargear.csv` | weapon profiles (one row per weapon) |
| `Datasheets_keywords.csv` | unit keywords |

All CSV files are read from `wahapedia-data/` (repo root).

### Filtering

- **Faction filter:** keep only rows where `faction_id` is in the `--factions` CLI argument.
- **Kill Team filter:** skip any datasheet whose name contains `"Kill Team"` (case-insensitive).

### Multi-model units

Each row in `Datasheets_models.csv` for a given datasheet becomes a separate `UnitProfile`:

- **Single model line:** unit name used as-is (e.g. `"Ork Boyz"`).
- **Multiple model lines:** model name appended (e.g. `"Intercessor Squad - Sergeant"`, `"Intercessor Squad - Intercessor"`).

All model lines on a datasheet share the same weapon pool (wargear is at datasheet level).

### Field mapping

| CSV field | Mapping |
|---|---|
| `T` | `toughness` |
| `Sv` | `save` — strip trailing `+` (e.g. `"3+"` → `3`) |
| `inv_sv` | `invuln` — strip trailing `+`; omit field if empty/`-` |
| `W` | `wounds` |
| `type` (`Ranged`/`Melee`) | routes weapon to `shootingWeapons` or `meleeWeapons` |
| `A` | `attacks` as `DiceExpression`; validate; skip weapon + warn if invalid |
| `BS_WS` | `skill` — strip `+` suffix; `"N/A"` → `0` (Torrent auto-hit, skill irrelevant) |
| `S` | `strength` |
| `AP` | `ap` — stored as positive integer (Wahapedia uses negative values; negate on import) |
| `D` | `damage` as `DiceExpression`; validate; skip weapon + warn if `"-"` or invalid |
| `description` | parsed into `WeaponAbility[]` via abilities lookup |

Unit `id` is a slug of the unit name: lowercase, spaces → `_`, non-alphanumeric stripped (e.g. `"Ork Boyz"` → `"ork_boyz"`).

---

## Ability Mapping (`abilities.ts`)

A single `Record<string, WeaponAbility>` keyed by normalized token (uppercased, whitespace-trimmed):

**Simple (no parameters):**
```ts
"ASSAULT", "BLAST", "CONVERSION", "DEVASTATING WOUNDS", "HAZARDOUS",
"HEAVY", "IGNORES COVER", "INDIRECT FIRE", "LANCE", "LETHAL HITS",
"LINKED FIRE", "PISTOL", "PRECISION", "PSYCHIC", "TORRENT", "TWIN-LINKED"
```

**Parameterized (parsed by regex before table lookup):**
- `"ANTI-<KEYWORD> <N>+"` → `{ type: "ANTI", keyword: "<KEYWORD>", threshold: N }`
- `"MELTA <N>"` → `{ type: "MELTA", value: N }`
- `"RAPID FIRE <N>"` → `{ type: "RAPID_FIRE", value: N }`
- `"SUSTAINED HITS <N>"` → `{ type: "SUSTAINED_HITS", value: N }`

**Pattern for new abilities:** Add to `WeaponAbility` in `types.ts` first (even if no calculator effect), then add to the lookup table. Never silently drop a recognized ability string.

Tokens that match no entry and no parameterized pattern are logged as warnings but do not block the weapon from being imported.

---

## Output

`generate.ts` produces a `src/data/units.ts` with:
- A header comment: `// Generated by scripts/import-wahapedia. Do not edit manually.`
- The same `UNITS` record and `UNIT_LIST` export shape as the current file.

### Console reporting

```
Imported 360 units (274 SM, 86 ORK). Skipped 14 (Kill Team).
[WARN] Ork Boyz / Rokkit Launcha: invalid dice expression "3D6" in attacks — weapon skipped
[WARN] Intercessor Squad - Sergeant / Unknown Weapon: unrecognized ability token "UNKNOWN"
```

Clean run (no warnings) = fully faithful import with no data loss.

---

## What This Does Not Cover

- Faction-specific logic hooks (deferred until a concrete need arises across factions)
- Non-CSV Wahapedia data (stratagems, enhancements, detachment abilities)
- Point costs (not used by the calculator)
- Abilities with no calculator effect beyond HAZARDOUS and CONVERSION (already in `WeaponAbility`)
