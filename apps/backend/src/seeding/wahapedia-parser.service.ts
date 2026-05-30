import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  DiceExpression,
  UnitProfile,
  WeaponAbility,
  WeaponProfile,
} from "../common/types";

const DATA_DIR = join(__dirname, "../../wahapedia-data");

// ─── Row types ────────────────────────────────────────────────────────────────

type DatasheetRow = { id: string; name: string; faction_id: string };
type ModelRow = {
  datasheet_id: string;
  line: string;
  name: string;
  T: string;
  Sv: string;
  inv_sv: string;
  W: string;
};
type WargearRow = {
  datasheet_id: string;
  line: string;
  name: string;
  description: string;
  type: string;
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
};
type KeywordRow = { datasheet_id: string; keyword: string };
type FactionRow = { id: string; name: string };

type ParsedData = {
  datasheets: DatasheetRow[];
  models: ModelRow[];
  wargear: WargearRow[];
  keywords: KeywordRow[];
  factions: FactionRow[];
};

export type UnitWithFaction = UnitProfile & { factionId: string };

export type WeaponWarning = {
  unitName: string;
  weaponName: string;
  message: string;
};

export type TransformResult = {
  units: UnitWithFaction[];
  warnings: WeaponWarning[];
  factions: Array<{ id: string; name: string }>;
};

// ─── Ability parsing ──────────────────────────────────────────────────────────

const ABILITY_MAP: Record<string, WeaponAbility> = {
  ASSAULT: { type: "ASSAULT" },
  BLAST: { type: "BLAST" },
  BUBBLECHUKKA: { type: "BUBBLECHUKKA" },
  CONVERSION: { type: "CONVERSION" },
  "C'TAN POWER": { type: "CTAN_POWER" },
  "DEAD CHOPPY": { type: "DEAD_CHOPPY" },
  "DEVASTATING WOUNDS": { type: "DEVASTATING_WOUNDS" },
  "EXTRA ATTACKS": { type: "EXTRA_ATTACKS" },
  HARPOONED: { type: "HARPOONED" },
  HAZARDOUS: { type: "HAZARDOUS" },
  HEAVY: { type: "HEAVY" },
  HOOKED: { type: "HOOKED" },
  "IGNORES COVER": { type: "IGNORES_COVER" },
  IMPALED: { type: "IMPALED" },
  "INDIRECT FIRE": { type: "INDIRECT_FIRE" },
  LANCE: { type: "LANCE" },
  "LETHAL HITS": { type: "LETHAL_HITS" },
  "LINKED FIRE": { type: "LINKED_FIRE" },
  "ONE SHOT": { type: "ONE_SHOT" },
  OVERCHARGE: { type: "OVERCHARGE" },
  PISTOL: { type: "PISTOL" },
  "PLASMA WARHEAD": { type: "PLASMA_WARHEAD" },
  PRECISION: { type: "PRECISION" },
  PSYCHIC: { type: "PSYCHIC" },
  "PSYCHIC ASSASSIN": { type: "PSYCHIC_ASSASSIN" },
  "REVERBERATING SUMMONS": { type: "REVERBERATING_SUMMONS" },
  SNAGGED: { type: "SNAGGED" },
  TORRENT: { type: "TORRENT" },
  "TWIN-LINKED": { type: "TWIN_LINKED" },
};

type ParameterizedParser = {
  re: RegExp;
  parse: (match: RegExpMatchArray) => WeaponAbility;
};

const PARAMETERIZED: ParameterizedParser[] = [
  {
    re: /^ANTI-(.+?)\s+(\d+)\+$/i,
    parse: (m) => ({
      type: "ANTI",
      keyword: m[1].toUpperCase(),
      threshold: parseInt(m[2], 10),
    }),
  },
  {
    re: /^MELTA\s+(\d+)$/i,
    parse: (m) => ({ type: "MELTA", value: parseInt(m[1], 10) }),
  },
  {
    re: /^RAPID FIRE\s+(\d+|(?:\d+)?D(?:3|6)(?:[+-]\d+)?)$/i,
    parse: (m) => {
      const raw = m[1].toUpperCase();
      return {
        type: "RAPID_FIRE",
        value: /^\d+$/.test(raw) ? parseInt(raw, 10) : (raw as DiceExpression),
      };
    },
  },
  {
    re: /^SUSTAINED HITS\s+(\d+|(?:\d+)?D(?:3|6)(?:[+-]\d+)?)$/i,
    parse: (m) => {
      const raw = m[1].toUpperCase();
      return {
        type: "SUSTAINED_HITS",
        value: /^\d+$/.test(raw) ? parseInt(raw, 10) : (raw as DiceExpression),
      };
    },
  },
];

export type ParseAbilitiesResult = {
  abilities: WeaponAbility[];
  unknownTokens: string[];
};

export const parseAbilities = (description: string): ParseAbilitiesResult => {
  if (!description.trim()) return { abilities: [], unknownTokens: [] };

  const abilities: WeaponAbility[] = [];
  const unknownTokens: string[] = [];

  for (const token of description
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)) {
    if (ABILITY_MAP[token]) {
      abilities.push(ABILITY_MAP[token]);
      continue;
    }

    let matched = false;
    for (const { re, parse } of PARAMETERIZED) {
      const m = token.match(re);
      if (m) {
        abilities.push(parse(m));
        matched = true;
        break;
      }
    }
    if (!matched) unknownTokens.push(token);
  }

  return { abilities, unknownTokens };
};

// ─── Weapon ID derivation ─────────────────────────────────────────────────────

const slugify = (s: string): string =>
  s
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

// ─── CSV parsing ──────────────────────────────────────────────────────────────

const parseCsv = (content: string): Record<string, string>[] => {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()]),
    );
  });
};

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
  if (DICE_EXPR_RE.test(t)) return t.toUpperCase() as DiceExpression;
  return null;
};

const weaponFingerprint = (
  name: string,
  type: string,
  attacks: DiceExpression,
  skill: number,
  strength: DiceExpression,
  ap: number,
  damage: DiceExpression,
): string => `${name}|${type}|${attacks}|${skill}|${strength}|${ap}|${damage}`;

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

  const { abilities, unknownTokens } = parseAbilities(row.description);
  for (const token of unknownTokens) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `unrecognized ability token "${token}"`,
    });
  }

  return {
    name: row.name,
    attacks,
    skill: parseSkill(row.BS_WS),
    strength,
    ap: -apRaw,
    damage,
    abilities,
  };
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WahapediaParserService {
  async parseAndTransform(): Promise<TransformResult> {
    const data = await this.parseAll();
    return this.transform(data);
  }

  private async parseAll(): Promise<ParsedData> {
    const readCsv = async (
      filename: string,
    ): Promise<Record<string, string>[]> => {
      const content = await readFile(join(DATA_DIR, filename), "utf-8");
      return parseCsv(content);
    };

    const [dsRaw, modRaw, wgRaw, kwRaw, facRaw] = await Promise.all([
      readCsv("Datasheets.csv"),
      readCsv("Datasheets_models.csv"),
      readCsv("Datasheets_wargear.csv"),
      readCsv("Datasheets_keywords.csv"),
      readCsv("Factions.csv"),
    ]);

    return {
      datasheets: dsRaw.map((r) => ({
        id: r["id"],
        name: r["name"],
        faction_id: r["faction_id"],
      })),
      models: modRaw.map((r) => ({
        datasheet_id: r["datasheet_id"],
        line: r["line"],
        name: r["name"],
        T: r["T"],
        Sv: r["Sv"],
        inv_sv: r["inv_sv"],
        W: r["W"],
      })),
      wargear: wgRaw.map((r) => ({
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
      })),
      keywords: kwRaw.map((r) => ({
        datasheet_id: r["datasheet_id"],
        keyword: r["keyword"],
      })),
      factions: facRaw.map((r) => ({ id: r["id"], name: r["name"] })),
    };
  }

  private transform(data: ParsedData): TransformResult {
    const units: UnitWithFaction[] = [];
    const warnings: WeaponWarning[] = [];
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();

    const modelsBySheet = new Map<string, ModelRow[]>();
    for (const row of data.models) {
      const list = modelsBySheet.get(row.datasheet_id) ?? [];
      list.push(row);
      modelsBySheet.set(row.datasheet_id, list);
    }

    const wargearBySheet = new Map<string, WargearRow[]>();
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

    for (const sheet of data.datasheets) {
      const modelLines = modelsBySheet.get(sheet.id) ?? [];
      if (modelLines.length === 0) continue;

      const wargearRows = wargearBySheet.get(sheet.id) ?? [];
      const keywords = keywordsBySheet.get(sheet.id) ?? [];

      for (let i = 0; i < modelLines.length; ++i) {
        const modelLine = modelLines[i];
        const unitName =
          i === 0
            ? sheet.name
            : `${sheet.name} ${modelLine.name
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase())}`;

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
          if (wtype === "shooting") shootingWeapons.push(weapon);
          else meleeWeapons.push(weapon);
        }

        const invuln = parseInvuln(modelLine.inv_sv);
        units.push({
          id: slugify(unitName),
          name: unitName,
          toughness: parseInt(modelLine.T, 10),
          save: parseSave(modelLine.Sv),
          ...(invuln !== undefined && { invuln }),
          wounds: parseInt(modelLine.W, 10),
          keywords,
          shootingWeapons,
          meleeWeapons,
          defaultShootingWeaponIds: [],
          defaultMeleeWeaponIds: [],
          factionId: sheet.faction_id,
        });
      }
    }

    const usedFactionIds = new Set(units.map((u) => u.factionId));
    const factions = data.factions
      .filter((f) => usedFactionIds.has(f.id))
      .map((f) => ({ id: f.id, name: f.name }));

    return { units, warnings, factions };
  }
}
