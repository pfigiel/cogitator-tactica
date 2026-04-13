import type { WeaponAbility } from "../../src/lib/calculator/types";

// ─── Simple ability lookup table ──────────────────────────────────────────────
// Key: normalized token (uppercase, whitespace-trimmed).
// Adding a new no-parameter ability: add one line here.
//
// Intentionally absent tokens (generate [WARN] on import, by design):
//   "EXTRA ATTACKS"    — grants a second bonus weapon attack; not a modifier on the
//                        weapon itself but a rule that adds extra weapon activations.
//                        No WeaponAbility equivalent; acceptable data loss.
//   "ONE SHOT"         — weapon may only be fired once per battle; no calculator effect.
//   "SUSTAINED HITS D3" / "RAPID FIRE D6" — dice-valued parameters not yet supported
//                        by the parameterized parsers (which only handle integers).

const ABILITY_MAP: Record<string, WeaponAbility> = {
  ASSAULT: { type: "ASSAULT" },
  BLAST: { type: "BLAST" },
  CONVERSION: { type: "CONVERSION" },
  "DEVASTATING WOUNDS": { type: "DEVASTATING_WOUNDS" },
  HAZARDOUS: { type: "HAZARDOUS" },
  HEAVY: { type: "HEAVY" },
  "IGNORES COVER": { type: "IGNORES_COVER" },
  "INDIRECT FIRE": { type: "INDIRECT_FIRE" },
  LANCE: { type: "LANCE" },
  "LETHAL HITS": { type: "LETHAL_HITS" },
  "LINKED FIRE": { type: "LINKED_FIRE" },
  PISTOL: { type: "PISTOL" },
  PRECISION: { type: "PRECISION" },
  PSYCHIC: { type: "PSYCHIC" },
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
    // "ANTI-INFANTRY 4+", "ANTI-VEHICLE 2+", "ANTI-FLY 4+"
    re: /^ANTI-(\w+)\s+(\d+)\+$/i,
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
