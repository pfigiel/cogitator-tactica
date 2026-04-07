# Wahapedia Unit Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `DiceExpression` type to the calculator, then build a script that reads Wahapedia CSV exports and generates `src/data/units.ts`.

**Architecture:** Type system changes first (`DiceExpression`, `HAZARDOUS`), then pipeline wiring (`diceAverage()`), then the five-module import script (`parse` → `transform` → `generate`, with `abilities` as a dependency of `transform`). The script is run once via `npm run import-units` and overwrites `src/data/units.ts` in place.

**Tech Stack:** TypeScript, tsx (for running scripts directly), Node.js built-in `fs/promises` and `node:util` for I/O and CLI arg parsing. No external CSV library.

---

## File Map

**Modified:**
- `src/lib/calculator/types.ts` — add `DiceExpression`, update `WeaponProfile`, add `HAZARDOUS` to `WeaponAbility`
- `src/lib/calculator/dice.ts` — add `diceAverage()` helper
- `src/lib/calculator/pipeline.ts` — use `diceAverage()` for `weapon.attacks` and `weapon.damage`
- `src/lib/calculator/modifiers.ts` — add `HAZARDOUS` to the no-op switch cases
- `package.json` — add `tsx` devDependency, add `import-units` script

**Created:**
- `scripts/import-wahapedia/parse.ts` — reads CSV files into typed row objects
- `scripts/import-wahapedia/abilities.ts` — lookup table and parameterized parsers
- `scripts/import-wahapedia/transform.ts` — joins rows → `UnitProfile[]`
- `scripts/import-wahapedia/generate.ts` — serializes `UnitProfile[]` to `units.ts` source
- `scripts/import-wahapedia/index.ts` — entry point, CLI args, file I/O, summary output

---

## Task 1: Add `DiceExpression` to `types.ts` and update `WeaponProfile`

**Files:**
- Modify: `src/lib/calculator/types.ts`

- [ ] **Step 1: Add `DiceExpression` type alias and `HAZARDOUS` ability**

  Open `src/lib/calculator/types.ts`. After the closing `};` of the `WeaponAbility` union (currently line 22), add the `DiceExpression` type. Also add `| { type: "HAZARDOUS" }` to the `WeaponAbility` union.

  The updated top section of `types.ts` should read:

  ```ts
  export type WeaponAbility =
    | { type: "ANTI"; keyword: string; threshold: number }
    | { type: "ASSAULT" }
    | { type: "BLAST" }
    | { type: "CONVERSION" }
    | { type: "DEVASTATING_WOUNDS" }
    | { type: "HAZARDOUS" }
    | { type: "HEAVY" }
    | { type: "IGNORES_COVER" }
    | { type: "INDIRECT_FIRE" }
    | { type: "LANCE" }
    | { type: "LETHAL_HITS" }
    | { type: "LINKED_FIRE" }
    | { type: "MELTA"; value: number }
    | { type: "PISTOL" }
    | { type: "PRECISION" }
    | { type: "PSYCHIC" }
    | { type: "RAPID_FIRE"; value: number }
    | { type: "SUSTAINED_HITS"; value: number }
    | { type: "TORRENT" }
    | { type: "TWIN_LINKED" };

  /**
   * A fixed number or a dice expression string, e.g. "D6", "2D6", "D3+3".
   * Valid string pattern: /^(\d+)?D(3|6)([+-]\d+)?$/i
   * The calculator always works with expected (average) values via diceAverage().
   */
  export type DiceExpression = number | string;
  ```

- [ ] **Step 2: Update `WeaponProfile` to use `DiceExpression`**

  In the same file, update the `WeaponProfile` interface:

  ```ts
  export interface WeaponProfile {
    name: string;
    /** Number of attacks per model. Fixed number or dice expression e.g. "D6". */
    attacks: DiceExpression;
    /** Skill threshold (e.g. 3 means 3+). For BS (shooting) or WS (melee). */
    skill: number;
    strength: number;
    ap: number;
    /** Damage per unsaved wound. Fixed number or dice expression e.g. "D3". */
    damage: DiceExpression;
    abilities: WeaponAbility[];
  }
  ```

- [ ] **Step 3: Verify lint passes**

  ```bash
  npm run lint
  ```

  Expected: errors in `pipeline.ts` where `weapon.attacks` and `weapon.damage` are used in arithmetic (TypeScript will flag `DiceExpression` not being assignable to `number`). This is expected — Task 3 fixes them. No new errors in `types.ts` itself.

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/calculator/types.ts
  git commit -m "feat: add DiceExpression type and HAZARDOUS weapon ability"
  ```

---

## Task 2: Add `diceAverage()` to `dice.ts`

**Files:**
- Modify: `src/lib/calculator/dice.ts`

- [ ] **Step 1: Add `diceAverage` import and function**

  Add to the top of `src/lib/calculator/dice.ts` — add `DiceExpression` to the existing import from `"./types"`:

  ```ts
  import { Modifier, RerollType, DiceExpression } from "./types";
  ```

  Then append the following function at the end of the file:

  ```ts
  /**
   * Returns the expected (average) value of a DiceExpression.
   * Numbers pass through unchanged.
   * Valid string formats: D3, D6, 2D6, D3+3, D6+1, etc.
   * Throws if the expression is not a valid pattern — validate at import time, not here.
   */
  export function diceAverage(expr: DiceExpression): number {
    if (typeof expr === "number") return expr;
    const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i);
    if (!match) throw new Error(`Invalid DiceExpression: "${expr}"`);
    const multiplier = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    return multiplier * ((1 + sides) / 2) + modifier;
  }
  ```

  Examples: `diceAverage(2)` → `2`, `diceAverage("D6")` → `3.5`, `diceAverage("D3")` → `2`, `diceAverage("2D6")` → `7`, `diceAverage("D3+3")` → `5`, `diceAverage("D6+1")` → `4.5`.

- [ ] **Step 2: Commit**

  ```bash
  git add src/lib/calculator/dice.ts
  git commit -m "feat: add diceAverage helper for DiceExpression support"
  ```

---

## Task 3: Update `pipeline.ts` to use `diceAverage()`

**Files:**
- Modify: `src/lib/calculator/pipeline.ts`

- [ ] **Step 1: Add `diceAverage` to the dice import**

  Change the existing dice import in `pipeline.ts` (currently line 16–22):

  ```ts
  import {
    pSuccess,
    woundThreshold,
    effectiveSaveThreshold,
    pSuccessWithReroll,
    pCritWithReroll,
    diceAverage,
  } from "./dice";
  ```

- [ ] **Step 2: Use `diceAverage` in Step 1 (Attacks)**

  Change line 59:
  ```ts
  // Before:
  const totalAttacks = modelCount * weapon.attacks + extraAttacks;
  // After:
  const totalAttacks = modelCount * diceAverage(weapon.attacks) + extraAttacks;
  ```

- [ ] **Step 3: Use `diceAverage` in Step 5 (Damage)**

  Change line 163:
  ```ts
  // Before:
  const damagePerWound = weapon.damage + extraDamage;
  // After:
  const damagePerWound = diceAverage(weapon.damage) + extraDamage;
  ```

- [ ] **Step 4: Verify lint passes clean**

  ```bash
  npm run lint
  ```

  Expected: no errors. The two arithmetic sites are fixed; `types.ts` and `dice.ts` are clean.

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/calculator/pipeline.ts
  git commit -m "feat: use diceAverage in pipeline for attacks and damage steps"
  ```

---

## Task 4: Update `modifiers.ts` for `HAZARDOUS`

**Files:**
- Modify: `src/lib/calculator/modifiers.ts`

- [ ] **Step 1: Add `HAZARDOUS` to the no-op switch cases**

  In `resolveWeaponModifiers`, the no-op section currently reads (lines 173–178):

  ```ts
  // ── No-op abilities (stored in type system for UI display only) ──────────
  case "ASSAULT":
  case "LINKED_FIRE":
  case "PISTOL":
  case "PRECISION":
  case "PSYCHIC":
    break;
  ```

  Add `HAZARDOUS`:

  ```ts
  // ── No-op abilities (stored in type system for UI display only) ──────────
  case "ASSAULT":
  case "HAZARDOUS":
  case "LINKED_FIRE":
  case "PISTOL":
  case "PRECISION":
  case "PSYCHIC":
    break;
  ```

- [ ] **Step 2: Verify lint passes**

  ```bash
  npm run lint
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/calculator/modifiers.ts
  git commit -m "feat: recognize HAZARDOUS ability as a no-op in modifier resolution"
  ```

---

## Task 5: Set up script tooling

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `tsx` as a dev dependency**

  ```bash
  npm install --save-dev tsx
  ```

- [ ] **Step 2: Add `import-units` script to `package.json`**

  Add to the `"scripts"` section in `package.json`:

  ```json
  "import-units": "tsx scripts/import-wahapedia/index.ts --factions SM,ORK"
  ```

  The full scripts section should look like:

  ```json
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "import-units": "tsx scripts/import-wahapedia/index.ts --factions SM,ORK"
  }
  ```

- [ ] **Step 3: Create the script directory**

  ```bash
  mkdir -p scripts/import-wahapedia
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add package.json package-lock.json
  git commit -m "chore: add tsx and import-units script"
  ```

---

## Task 6: Create `scripts/import-wahapedia/parse.ts`

**Files:**
- Create: `scripts/import-wahapedia/parse.ts`

This module reads the four CSV files and returns typed row arrays. It contains no transformation logic.

- [ ] **Step 1: Write `parse.ts`**

  Create `scripts/import-wahapedia/parse.ts`:

  ```ts
  import { readFile } from "node:fs/promises";
  import { join } from "node:path";

  const DATA_DIR = join(process.cwd(), "wahapedia-data");

  // ─── Row types ────────────────────────────────────────────────────────────────

  export interface DatasheetRow {
    id: string;
    name: string;
    faction_id: string;
  }

  export interface ModelRow {
    datasheet_id: string;
    line: string;
    name: string;      // model variant name (e.g. "Sergeant"); may be same as unit name
    T: string;
    Sv: string;
    inv_sv: string;
    W: string;
  }

  export interface WargearRow {
    datasheet_id: string;
    line: string;
    name: string;
    description: string;  // comma-separated ability tokens
    type: string;          // "Ranged" | "Melee"
    A: string;
    BS_WS: string;
    S: string;
    AP: string;
    D: string;
  }

  export interface KeywordRow {
    datasheet_id: string;
    keyword: string;
  }

  // ─── CSV parser ───────────────────────────────────────────────────────────────

  function parseCsv(content: string): Record<string, string>[] {
    const lines = content.replace(/^\uFEFF/, "").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split("|").map((h) => h.trim()).filter(Boolean);
    return lines.slice(1).map((line) => {
      const values = line.split("|");
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
    });
  }

  async function readCsv(filename: string): Promise<Record<string, string>[]> {
    const content = await readFile(join(DATA_DIR, filename), "utf-8");
    return parseCsv(content);
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  export interface ParsedData {
    datasheets: DatasheetRow[];
    models: ModelRow[];
    wargear: WargearRow[];
    keywords: KeywordRow[];
  }

  export async function parseAll(): Promise<ParsedData> {
    const [dsRaw, modRaw, wgRaw, kwRaw] = await Promise.all([
      readCsv("Datasheets.csv"),
      readCsv("Datasheets_models.csv"),
      readCsv("Datasheets_wargear.csv"),
      readCsv("Datasheets_keywords.csv"),
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

    return { datasheets, models, wargear, keywords };
  }
  ```

- [ ] **Step 2: Verify the file compiles**

  ```bash
  npx tsx --check scripts/import-wahapedia/parse.ts
  ```

  Expected: no output (clean compile). If `tsx --check` isn't available on this version, skip to the lint gate in the final task.

- [ ] **Step 3: Commit**

  ```bash
  git add scripts/import-wahapedia/parse.ts
  git commit -m "feat: add wahapedia CSV parser module"
  ```

---

## Task 7: Create `scripts/import-wahapedia/abilities.ts`

**Files:**
- Create: `scripts/import-wahapedia/abilities.ts`

This module owns all ability string → `WeaponAbility` translation. It is the single extension point when new ability tokens appear.

- [ ] **Step 1: Write `abilities.ts`**

  Create `scripts/import-wahapedia/abilities.ts`:

  ```ts
  import type { WeaponAbility } from "../../src/lib/calculator/types";

  // ─── Simple ability lookup table ──────────────────────────────────────────────
  // Key: normalized token (uppercase, whitespace-trimmed).
  // Adding a new no-parameter ability: add one line here.

  const ABILITY_MAP: Record<string, WeaponAbility> = {
    "ASSAULT":            { type: "ASSAULT" },
    "BLAST":              { type: "BLAST" },
    "CONVERSION":         { type: "CONVERSION" },
    "DEVASTATING WOUNDS": { type: "DEVASTATING_WOUNDS" },
    "HAZARDOUS":          { type: "HAZARDOUS" },
    "HEAVY":              { type: "HEAVY" },
    "IGNORES COVER":      { type: "IGNORES_COVER" },
    "INDIRECT FIRE":      { type: "INDIRECT_FIRE" },
    "LANCE":              { type: "LANCE" },
    "LETHAL HITS":        { type: "LETHAL_HITS" },
    "LINKED FIRE":        { type: "LINKED_FIRE" },
    "PISTOL":             { type: "PISTOL" },
    "PRECISION":          { type: "PRECISION" },
    "PSYCHIC":            { type: "PSYCHIC" },
    "TORRENT":            { type: "TORRENT" },
    "TWIN-LINKED":        { type: "TWIN_LINKED" },
  };

  // ─── Parameterized ability parsers ────────────────────────────────────────────
  // Each entry: regex with named capture groups, factory function.
  // Adding a new parameterized ability: add one entry here.

  interface ParameterizedParser {
    re: RegExp;
    parse: (match: RegExpMatchArray) => WeaponAbility;
  }

  const PARAMETERIZED: ParameterizedParser[] = [
    {
      // "ANTI-INFANTRY 4+", "ANTI-VEHICLE 2+", "ANTI-FLY 4+"
      re: /^ANTI-(\w+)\s+(\d+)\+$/i,
      parse: (m) => ({ type: "ANTI", keyword: m[1].toUpperCase(), threshold: parseInt(m[2], 10) }),
    },
    {
      // "MELTA 2", "MELTA 3"
      re: /^MELTA\s+(\d+)$/i,
      parse: (m) => ({ type: "MELTA", value: parseInt(m[1], 10) }),
    },
    {
      // "RAPID FIRE 1", "RAPID FIRE 2", "RAPID FIRE 3"
      re: /^RAPID FIRE\s+(\d+)$/i,
      parse: (m) => ({ type: "RAPID_FIRE", value: parseInt(m[1], 10) }),
    },
    {
      // "SUSTAINED HITS 1", "SUSTAINED HITS 2"
      re: /^SUSTAINED HITS\s+(\d+)$/i,
      parse: (m) => ({ type: "SUSTAINED_HITS", value: parseInt(m[1], 10) }),
    },
  ];

  // ─── Public API ───────────────────────────────────────────────────────────────

  export interface ParseAbilitiesResult {
    abilities: WeaponAbility[];
    unknownTokens: string[];
  }

  /**
   * Parse a comma-separated ability description string into WeaponAbility[].
   * Returns recognized abilities and a list of unrecognized tokens for warning output.
   *
   * Example: "ANTI-INFANTRY 4+, DEVASTATING WOUNDS, RAPID FIRE 1"
   * → abilities: [ANTI infantry/4, DEVASTATING_WOUNDS, RAPID_FIRE/1]
   * → unknownTokens: []
   */
  export function parseAbilities(description: string): ParseAbilitiesResult {
    if (!description.trim()) return { abilities: [], unknownTokens: [] };

    const abilities: WeaponAbility[] = [];
    const unknownTokens: string[] = [];

    const tokens = description.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);

    for (const token of tokens) {
      // 1. Try simple lookup
      if (ABILITY_MAP[token]) {
        abilities.push(ABILITY_MAP[token]);
        continue;
      }

      // 2. Try parameterized parsers
      let matched = false;
      for (const { re, parse } of PARAMETERIZED) {
        const m = token.match(re);
        if (m) {
          abilities.push(parse(m));
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // 3. Unknown — collect for warning
      unknownTokens.push(token);
    }

    return { abilities, unknownTokens };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/import-wahapedia/abilities.ts
  git commit -m "feat: add wahapedia ability lookup table and parsers"
  ```

---

## Task 8: Create `scripts/import-wahapedia/transform.ts`

**Files:**
- Create: `scripts/import-wahapedia/transform.ts`

This module joins all four CSV row sets into `UnitProfile[]`, applying field mappings and validation.

- [ ] **Step 1: Write `transform.ts`**

  Create `scripts/import-wahapedia/transform.ts`:

  ```ts
  import type { UnitProfile, WeaponProfile, DiceExpression } from "../../src/lib/calculator/types";
  import type { ParsedData, WargearRow } from "./parse";
  import { parseAbilities } from "./abilities";

  // ─── Field parsing helpers ────────────────────────────────────────────────────

  function parseSave(raw: string): number {
    return parseInt(raw.replace("+", ""), 10);
  }

  function parseInvuln(raw: string): number | undefined {
    const t = raw.trim();
    if (!t || t === "-") return undefined;
    return parseInt(t.replace("+", ""), 10);
  }

  function parseSkill(raw: string): number {
    const t = raw.trim();
    if (t === "N/A" || t === "-" || t === "") return 0;
    return parseInt(t.replace("+", ""), 10);
  }

  const DICE_EXPR_RE = /^(\d+)?D(3|6)([+-]\d+)?$/i;

  function parseDiceExpression(raw: string): DiceExpression | null {
    const t = raw.trim();
    if (t === "-" || t === "") return null;
    const asNum = Number(t);
    if (!isNaN(asNum)) return asNum;
    if (DICE_EXPR_RE.test(t)) return t.toUpperCase();
    return null; // invalid
  }

  function slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  // ─── Weapon building ──────────────────────────────────────────────────────────

  export interface WeaponWarning {
    unitName: string;
    weaponName: string;
    message: string;
  }

  function buildWeapon(
    row: WargearRow,
    unitName: string,
    warnings: WeaponWarning[],
  ): WeaponProfile | null {
    const attacks = parseDiceExpression(row.A);
    if (attacks === null) {
      warnings.push({ unitName, weaponName: row.name, message: `invalid attacks value "${row.A}" — weapon skipped` });
      return null;
    }

    const damage = parseDiceExpression(row.D);
    if (damage === null) {
      warnings.push({ unitName, weaponName: row.name, message: `invalid damage value "${row.D}" — weapon skipped` });
      return null;
    }

    const skill = parseSkill(row.BS_WS);
    const strength = parseInt(row.S, 10);
    const ap = -parseInt(row.AP, 10); // Wahapedia stores negative; app uses positive

    const { abilities, unknownTokens } = parseAbilities(row.description);
    for (const token of unknownTokens) {
      warnings.push({ unitName, weaponName: row.name, message: `unrecognized ability token "${token}"` });
    }

    return { name: row.name, attacks, skill, strength, ap, damage, abilities };
  }

  // ─── Main transform ───────────────────────────────────────────────────────────

  export interface TransformResult {
    units: UnitProfile[];
    warnings: WeaponWarning[];
    skippedKillTeam: number;
    countByFaction: Map<string, number>;
  }

  export function transform(data: ParsedData, factions: string[]): TransformResult {
    const units: UnitProfile[] = [];
    const warnings: WeaponWarning[] = [];
    const countByFaction = new Map<string, number>(factions.map((f) => [f, 0]));
    let skippedKillTeam = 0;

    // Index models and wargear by datasheet_id for O(1) lookup
    const modelsBySheet = new Map<string, typeof data.models>();
    for (const row of data.models) {
      const list = modelsBySheet.get(row.datasheet_id) ?? [];
      list.push(row);
      modelsBySheet.set(row.datasheet_id, list);
    }

    const wargearBySheet = new Map<string, typeof data.wargear>();
    for (const row of data.wargear) {
      const list = wargearBySheet.get(row.datasheet_id) ?? [];
      list.push(row);
      wargearBySheet.set(row.datasheet_id, list);
    }

    const keywordsBySheet = new Map<string, string[]>();
    for (const row of data.keywords) {
      const list = keywordsBySheet.get(row.datasheet_id) ?? [];
      list.push(row.keyword.toUpperCase());
      keywordsBySheet.set(row.datasheet_id, list);
    }

    // Process each datasheet
    for (const sheet of data.datasheets) {
      if (!factions.includes(sheet.faction_id)) continue;
      if (/kill team/i.test(sheet.name)) {
        skippedKillTeam++;
        continue;
      }

      const modelLines = modelsBySheet.get(sheet.id) ?? [];
      if (modelLines.length === 0) continue;

      const wargearRows = wargearBySheet.get(sheet.id) ?? [];
      const keywords = keywordsBySheet.get(sheet.id) ?? [];
      const isMultiModel = modelLines.length > 1;

      for (const modelLine of modelLines) {
        const unitName = isMultiModel
          ? `${sheet.name} - ${modelLine.name}`
          : sheet.name;

        const unitId = slugify(unitName);
        const toughness = parseInt(modelLine.T, 10);
        const save = parseSave(modelLine.Sv);
        const invuln = parseInvuln(modelLine.inv_sv);
        const wounds = parseInt(modelLine.W, 10);

        // Build weapons — separate by type
        const shootingWeapons: WeaponProfile[] = [];
        const meleeWeapons: WeaponProfile[] = [];

        for (const wgRow of wargearRows) {
          const weapon = buildWeapon(wgRow, unitName, warnings);
          if (!weapon) continue;
          if (wgRow.type.toLowerCase() === "ranged") {
            shootingWeapons.push(weapon);
          } else {
            meleeWeapons.push(weapon);
          }
        }

        const unit: UnitProfile = {
          id: unitId,
          name: unitName,
          toughness,
          save,
          ...(invuln !== undefined ? { invuln } : {}),
          wounds,
          keywords,
          shootingWeapons,
          meleeWeapons,
        };

        units.push(unit);
        countByFaction.set(sheet.faction_id, (countByFaction.get(sheet.faction_id) ?? 0) + 1);
      }
    }

    return { units, warnings, skippedKillTeam, countByFaction };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/import-wahapedia/transform.ts
  git commit -m "feat: add wahapedia data transform — CSV rows to UnitProfile[]"
  ```

---

## Task 9: Create `scripts/import-wahapedia/generate.ts`

**Files:**
- Create: `scripts/import-wahapedia/generate.ts`

This module takes a `UnitProfile[]` and returns the full `units.ts` source string.

- [ ] **Step 1: Write `generate.ts`**

  Create `scripts/import-wahapedia/generate.ts`:

  ```ts
  import type { UnitProfile } from "../../src/lib/calculator/types";

  export function generateUnitsFile(units: UnitProfile[]): string {
    const unitsRecord = Object.fromEntries(units.map((u) => [u.id, u]));
    const body = JSON.stringify(unitsRecord, null, 2);

    return [
      "// Generated by scripts/import-wahapedia. Do not edit manually.",
      'import { UnitProfile } from "@/lib/calculator/types";',
      "",
      "export const UNITS: Record<string, UnitProfile> = " + body + ";",
      "",
      "export const UNIT_LIST = Object.values(UNITS);",
      "",
    ].join("\n");
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/import-wahapedia/generate.ts
  git commit -m "feat: add wahapedia units.ts generator"
  ```

---

## Task 10: Create `scripts/import-wahapedia/index.ts`

**Files:**
- Create: `scripts/import-wahapedia/index.ts`

Entry point: parses CLI args, runs the pipeline, writes `src/data/units.ts`, prints summary.

- [ ] **Step 1: Write `index.ts`**

  Create `scripts/import-wahapedia/index.ts`:

  ```ts
  import { parseArgs } from "node:util";
  import { writeFile } from "node:fs/promises";
  import { join } from "node:path";
  import { parseAll } from "./parse";
  import { transform } from "./transform";
  import { generateUnitsFile } from "./generate";

  async function main() {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        factions: { type: "string", default: "SM,ORK" },
      },
    });

    const factions = (values.factions as string).split(",").map((f) => f.trim().toUpperCase());

    console.log(`Importing factions: ${factions.join(", ")}`);

    const data = await parseAll();
    const { units, warnings, skippedKillTeam, countByFaction } = transform(data, factions);

    // Print warnings
    for (const w of warnings) {
      console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
    }

    // Print summary
    const byFaction = factions
      .map((f) => `${f}: ${countByFaction.get(f) ?? 0}`)
      .join(", ");
    console.log(
      `Imported ${units.length} units (${byFaction}). Skipped ${skippedKillTeam} (Kill Team).`,
    );

    // Write output
    const outputPath = join(process.cwd(), "src/data/units.ts");
    const content = generateUnitsFile(units);
    await writeFile(outputPath, content, "utf-8");
    console.log(`Written to ${outputPath}`);
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add scripts/import-wahapedia/index.ts
  git commit -m "feat: add wahapedia import script entry point"
  ```

---

## Task 11: Run the import and verify

- [ ] **Step 1: Run the import script**

  ```bash
  npm run import-units
  ```

  Expected output (numbers approximate):
  ```
  Importing factions: SM, ORK
  [WARN] ... (any skipped weapons with invalid values)
  Imported N units. Skipped M (Kill Team).
  Written to .../src/data/units.ts
  ```

- [ ] **Step 2: Verify `src/data/units.ts` was generated**

  ```bash
  head -5 src/data/units.ts
  ```

  Expected:
  ```
  // Generated by scripts/import-wahapedia. Do not edit manually.
  import { UnitProfile } from "@/lib/calculator/types";

  export const UNITS: Record<string, UnitProfile> = {
  ```

- [ ] **Step 3: Run lint to verify the generated file is valid TypeScript**

  ```bash
  npm run lint
  ```

  Expected: no errors. If lint reports type errors in `src/data/units.ts`, check the transform output for malformed values (e.g. `NaN` from a parse failure) and fix the corresponding parsing helper in `transform.ts`.

- [ ] **Step 4: Verify the app still runs**

  ```bash
  npm run build
  ```

  Expected: successful build. If units with unexpected data break the UI, check the generated values in `units.ts` and trace back to the CSV row.

- [ ] **Step 5: Commit**

  ```bash
  git add src/data/units.ts
  git commit -m "feat: generate units.ts from Wahapedia SM and ORK data"
  ```
