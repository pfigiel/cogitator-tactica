import type { WeaponAbility } from "../../src/lib/calculator/types";

// ─── Simple ability lookup table ──────────────────────────────────────────────
// Key: normalized token (uppercase, whitespace-trimmed).
// Adding a new no-parameter ability: add one line here.

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

// ─── Parameterized ability parsers ────────────────────────────────────────────
// Each entry: regex with capture groups, factory function.
// Adding a new parameterized ability: add one entry here.

type ParameterizedParser = {
  re: RegExp;
  parse: (match: RegExpMatchArray) => WeaponAbility;
};

const PARAMETERIZED: ParameterizedParser[] = [
  {
    // "ANTI-INFANTRY 4+", "ANTI-VEHICLE 2+", "ANTI-FLY 4+", "ANTI-EPIC HERO 2+"
    re: /^ANTI-(.+?)\s+(\d+)\+$/i,
    parse: (m) => ({
      type: "ANTI",
      keyword: m[1].toUpperCase(),
      threshold: parseInt(m[2], 10),
    }),
  },
  {
    // "MELTA 2", "MELTA 3"
    re: /^MELTA\s+(\d+)$/i,
    parse: (m) => ({ type: "MELTA", value: parseInt(m[1], 10) }),
  },
  {
    // "RAPID FIRE 1", "RAPID FIRE 2", "RAPID FIRE D3", "RAPID FIRE D6", "RAPID FIRE D6+3"
    re: /^RAPID FIRE\s+(\d+|(?:\d+)?D(?:3|6)(?:[+-]\d+)?)$/i,
    parse: (m) => {
      const raw = m[1].toUpperCase();
      return {
        type: "RAPID_FIRE",
        value: /^\d+$/.test(raw) ? parseInt(raw, 10) : raw,
      };
    },
  },
  {
    // "SUSTAINED HITS 1", "SUSTAINED HITS 2", "SUSTAINED HITS D3", "SUSTAINED HITS D6", "SUSTAINED HITS D6+3"
    re: /^SUSTAINED HITS\s+(\d+|(?:\d+)?D(?:3|6)(?:[+-]\d+)?)$/i,
    parse: (m) => {
      const raw = m[1].toUpperCase();
      return {
        type: "SUSTAINED_HITS",
        value: /^\d+$/.test(raw) ? parseInt(raw, 10) : raw,
      };
    },
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export type ParseAbilitiesResult = {
  abilities: WeaponAbility[];
  unknownTokens: string[];
};

/**
 * Parse a comma-separated ability description string into WeaponAbility[].
 * Returns recognized abilities and a list of unrecognized tokens for warning output.
 *
 * Example: "ANTI-INFANTRY 4+, DEVASTATING WOUNDS, RAPID FIRE 1"
 * → abilities: [ANTI infantry/4, DEVASTATING_WOUNDS, RAPID_FIRE/1]
 * → unknownTokens: []
 */
export const parseAbilities = (description: string): ParseAbilitiesResult => {
  if (!description.trim()) return { abilities: [], unknownTokens: [] };

  const abilities: WeaponAbility[] = [];
  const unknownTokens: string[] = [];

  const tokens = description
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

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
};
