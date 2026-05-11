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
  name: string,
  type: string,
  attacks: string | number,
  skill: number,
  strength: string | number,
  ap: number,
  damage: string | number,
): string => `${name}|${type}|${attacks}|${skill}|${strength}|${ap}|${damage}`;

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
): Omit<WeaponProfile, "id"> | null => {
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
  const strength = parseDiceExpression(row.S);
  if (strength === null) {
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

export type UnitWithFaction = UnitProfile & { factionId: string };

export type TransformResult = {
  units: UnitWithFaction[];
  warnings: WeaponWarning[];
  countByFaction: Map<string, number>;
  factions: Array<{ id: string; name: string }>;
};

export const transform = (
  data: ParsedData,
  factions?: string[],
): TransformResult => {
  const units: UnitWithFaction[] = [];
  const warnings: WeaponWarning[] = [];
  const slugToFp = new Map<string, string>();
  const fpToId = new Map<string, string>();
  const countByFaction = new Map<string, number>(
    factions ? factions.map((f) => [f, 0]) : [],
  );

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
    if (factions && !factions.includes(sheet.faction_id)) continue;

    const modelLines = modelsBySheet.get(sheet.id) ?? [];
    if (modelLines.length === 0) continue;

    const wargearRows = wargearBySheet.get(sheet.id) ?? [];
    const keywords = keywordsBySheet.get(sheet.id) ?? [];

    for (let i = 0; i < modelLines.length; ++i) {
      const modelLine = modelLines[i];
      const isFirstLine = i === 0;
      const unitName = isFirstLine
        ? sheet.name
        : `${sheet.name} ${modelLine.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}`;

      const unitId = slugify(unitName);
      const toughness = parseInt(modelLine.T, 10);
      const save = parseSave(modelLine.Sv);
      const invuln = parseInvuln(modelLine.inv_sv);
      const wounds = parseInt(modelLine.W, 10);

      // Build weapons — separate by type
      const shootingWeapons: WeaponProfile[] = [];
      const meleeWeapons: WeaponProfile[] = [];

      for (const wgRow of wargearRows) {
        const weaponData = buildWeapon(wgRow, unitName, warnings);
        if (!weaponData) continue;

        const wtype =
          wgRow.type.toLowerCase() === "ranged" ? "shooting" : "melee";
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

        if (wtype === "shooting") {
          shootingWeapons.push(weapon);
        } else {
          meleeWeapons.push(weapon);
        }
      }

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

      units.push(unit);
      countByFaction.set(
        sheet.faction_id,
        (countByFaction.get(sheet.faction_id) ?? 0) + 1,
      );
    }
  }

  const usedFactionIds = new Set(units.map((u) => u.factionId));
  const factionsResult = data.factions
    .filter((f) => usedFactionIds.has(f.id))
    .map((f) => ({ id: f.id, name: f.name }));

  return { units, warnings, countByFaction, factions: factionsResult };
};
