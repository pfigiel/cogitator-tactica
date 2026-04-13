import { createHash } from "node:crypto";
import type {
  UnitProfile,
  WeaponProfile,
  DiceExpression,
} from "../../src/lib/calculator/types";
import type { ParsedData, WargearRow } from "./parse";
import { parseAbilities } from "./abilities";

// ─── Field parsing helpers ────────────────────────────────────────────────────

const parseSave = (raw: string): number => parseInt(raw.replace("+", ""), 10);

const parseInvuln = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t || t === "-") return undefined;

  return parseInt(t.replace("+", ""), 10);
};

const parseSkill = (raw: string): number => {
  const t = raw.trim();
  if (t === "N/A" || t === "-" || t === "") return 0;
  return parseInt(t.replace("+", ""), 10);
};

const DICE_EXPR_RE = /^(\d+)?D(3|6)([+-]\d+)?$/i;

const parseDiceExpression = (raw: string): DiceExpression | null => {
  const t = raw.trim();
  if (t === "-" || t === "") return null;
  const asNum = Number(t);
  if (!isNaN(asNum)) return asNum;
  if (DICE_EXPR_RE.test(t)) return t.toUpperCase();
  return null; // invalid
};

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

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
    const hash = createHash("sha256").update(fingerprint).digest("hex").slice(0, 6);
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

// ─── Weapon building ──────────────────────────────────────────────────────────

export type WeaponWarning = {
  unitName: string;
  weaponName: string;
  message: string;
};

const buildWeapon = (
  row: WargearRow,
  unitName: string,
  warnings: WeaponWarning[],
): WeaponProfile | null => {
  const attacks = parseDiceExpression(row.A);
  if (attacks === null) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid attacks value "${row.A}" — weapon skipped`,
    });
    return null;
  }

  const damage = parseDiceExpression(row.D);
  if (damage === null) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid damage value "${row.D}" — weapon skipped`,
    });
    return null;
  }

  const skill = parseSkill(row.BS_WS);
  const strength = parseInt(row.S, 10);
  if (isNaN(strength)) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid strength value "${row.S}" — weapon skipped`,
    });
    return null;
  }
  const apRaw = parseInt(row.AP, 10);
  if (isNaN(apRaw)) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid AP value "${row.AP}" — weapon skipped`,
    });
    return null;
  }
  const ap = -apRaw; // Wahapedia stores negative; app uses positive

  const { abilities, unknownTokens } = parseAbilities(row.description);
  for (const token of unknownTokens) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `unrecognized ability token "${token}"`,
    });
  }

  return { name: row.name, attacks, skill, strength, ap, damage, abilities };
};

// ─── Main transform ───────────────────────────────────────────────────────────

export type TransformResult = {
  units: UnitProfile[];
  warnings: WeaponWarning[];
  skippedKillTeam: number;
  countByFaction: Map<string, number>;
};

export const transform = (
  data: ParsedData,
  factions: string[],
): TransformResult => {
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
      countByFaction.set(
        sheet.faction_id,
        (countByFaction.get(sheet.faction_id) ?? 0) + 1,
      );
    }
  }

  return { units, warnings, skippedKillTeam, countByFaction };
};
