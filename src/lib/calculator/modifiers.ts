/**
 * Modifier resolution and aggregation.
 *
 * Translation layer : weapon abilities + context → Modifier[]
 * Aggregation helpers: Modifier[] → effective values consumed by pipeline steps
 */

import {
  WeaponProfile,
  UnitProfile,
  Modifier,
  ModifierEffect,
  RerollType,
  AttackerContext,
  DEFAULT_ATTACKER_CONTEXT,
} from "./types";

// ─── Translation ──────────────────────────────────────────────────────────────

/**
 * Translate all sources (weapon abilities, attacker context, defender cover)
 * into a flat Modifier list ready for the combat pipeline.
 *
 * This is the single translation layer between rules text and calculator logic.
 * Sources outside this function (auras, stratagems, etc.) push additional
 * Modifier objects into the same list before the pipeline runs.
 */
export const resolveWeaponModifiers = (
  weapon: WeaponProfile,
  context: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderInCover: boolean,
  defenderModelCount: number,
): Modifier[] => {
  const modifiers: Modifier[] = [];

  const hasIgnoresCover = weapon.abilities.some(
    (a) => a.type === "IGNORES_COVER",
  );

  // Cover: grants defender +1 to save (SAVE_THRESHOLD_DELTA −1 = easier save for defender).
  // Negated if the weapon has Ignores Cover.
  if (defenderInCover && !hasIgnoresCover) {
    modifiers.push({
      source: "cover",
      effect: { type: "SAVE_THRESHOLD_DELTA", value: -1 },
    });
  }

  for (const ability of weapon.abilities) {
    switch (ability.type) {
      // ── Calculator-active abilities ──────────────────────────────────────────

      case "ANTI": {
        const defKeywords = defenderUnit.keywords.map((k) => k.toUpperCase());
        if (defKeywords.includes(ability.keyword.toUpperCase())) {
          modifiers.push({
            source: `Anti-${ability.keyword} ${ability.threshold}+`,
            effect: { type: "CRIT_WOUND_THRESHOLD", value: ability.threshold },
          });
        }
        break;
      }

      case "BLAST":
        modifiers.push({
          source: "Blast",
          effect: {
            type: "EXTRA_ATTACKS",
            value: Math.floor(defenderModelCount / 5),
          },
        });
        break;

      case "CONVERSION":
        if (context.atLongRange) {
          modifiers.push({
            source: "Conversion",
            effect: { type: "CRIT_HIT_THRESHOLD", value: 4 },
          });
        }
        break;

      case "DEVASTATING_WOUNDS":
        modifiers.push({
          source: "Devastating Wounds",
          effect: { type: "DEVASTATING_WOUNDS" },
        });
        break;

      case "HEAVY":
        if (context.remainedStationary) {
          modifiers.push({
            source: "Heavy",
            effect: { type: "HIT_THRESHOLD_DELTA", value: -1 },
          });
        }
        break;

      case "IGNORES_COVER":
        modifiers.push({
          source: "Ignores Cover",
          effect: { type: "IGNORE_COVER" },
        });
        break;

      case "INDIRECT_FIRE":
        // −1 to hit (the penalty is not negated by Ignores Cover on the same weapon)
        modifiers.push({
          source: "Indirect Fire",
          effect: { type: "HIT_THRESHOLD_DELTA", value: 1 },
        });
        // Grants target the benefit of cover for saves (unless weapon also has Ignores Cover)
        if (!hasIgnoresCover) {
          modifiers.push({
            source: "Indirect Fire (cover)",
            effect: { type: "SAVE_THRESHOLD_DELTA", value: -1 },
          });
        }
        break;

      case "LANCE":
        if (context.charged) {
          modifiers.push({
            source: "Lance",
            effect: { type: "WOUND_THRESHOLD_DELTA", value: -1 },
          });
        }
        break;

      case "LETHAL_HITS":
        modifiers.push({
          source: "Lethal Hits",
          effect: { type: "LETHAL_HITS" },
        });
        break;

      case "MELTA":
        if (context.atHalfRange) {
          modifiers.push({
            source: `Melta (${ability.value})`,
            effect: { type: "EXTRA_DAMAGE", value: ability.value },
          });
        }
        break;

      case "RAPID_FIRE":
        if (context.atHalfRange && typeof ability.value === "number") {
          modifiers.push({
            source: `Rapid Fire (${ability.value})`,
            effect: { type: "EXTRA_ATTACKS", value: ability.value },
          });
        }
        break;

      case "SUSTAINED_HITS":
        if (typeof ability.value === "number") {
          modifiers.push({
            source: `Sustained Hits (${ability.value})`,
            effect: { type: "SUSTAINED_HITS", value: ability.value },
          });
        }
        break;

      case "TORRENT":
        modifiers.push({
          source: "Torrent",
          effect: { type: "AUTO_HIT" },
        });
        break;

      case "TWIN_LINKED":
        modifiers.push({
          source: "Twin-linked",
          effect: { type: "WOUND_REROLL", reroll: "ALL" },
        });
        break;

      // ── No-op abilities (stored in type system for UI display only) ──────────
      case "ASSAULT":
      case "BUBBLECHUKKA":
      case "CTAN_POWER":
      case "DEAD_CHOPPY":
      case "EXTRA_ATTACKS":
      case "HARPOONED":
      case "HAZARDOUS":
      case "HOOKED":
      case "IMPALED":
      case "LINKED_FIRE":
      case "ONE_SHOT":
      case "OVERCHARGE":
      case "PISTOL":
      case "PLASMA_WARHEAD":
      case "PRECISION":
      case "PSYCHIC":
      case "PSYCHIC_ASSASSIN":
      case "REVERBERATING_SUMMONS":
      case "SNAGGED":
        break;
    }
  }

  return modifiers;
};

// ─── Aggregation helpers ──────────────────────────────────────────────────────

/** Returns true if any modifier carries the given effect type. */
export const hasModifier = (
  modifiers: Modifier[],
  type: ModifierEffect["type"],
): boolean => modifiers.some((m) => m.effect.type === type);

/**
 * Sum all threshold-delta modifiers of the given type, clamp the total to [−1, +1],
 * then add to the base value.
 *
 * Clamping is applied AFTER summing (so +1 +1 −1 → +1, not +1 −1 = 0 then +1).
 */
export const applyAndClampDelta = (
  base: number,
  modifiers: Modifier[],
  type:
    | "HIT_THRESHOLD_DELTA"
    | "WOUND_THRESHOLD_DELTA"
    | "SAVE_THRESHOLD_DELTA"
    | "INVULN_THRESHOLD_DELTA",
): number => {
  const rawTotal = modifiers
    .filter((m) => m.effect.type === type)
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );
  return base + Math.max(-1, Math.min(1, rawTotal));
};

/**
 * Returns the effective crit threshold: minimum across all sources
 * (lower = easier to crit = better for attacker).
 */
export const effectiveCritThreshold = (
  modifiers: Modifier[],
  type: "CRIT_HIT_THRESHOLD" | "CRIT_WOUND_THRESHOLD",
  defaultValue = 6,
): number => {
  const values = modifiers
    .filter((m) => m.effect.type === type)
    .map((m) => (m.effect as { type: string; value: number }).value);
  return values.length > 0 ? Math.min(...values) : defaultValue;
};

/**
 * Returns the best reroll level across sources.
 * Priority: ALL > ONES > none.
 */
export const effectiveReroll = (
  modifiers: Modifier[],
  type: "HIT_REROLL" | "WOUND_REROLL" | "SAVE_REROLL",
): RerollType | null => {
  const rerolls = modifiers
    .filter((m) => m.effect.type === type)
    .map((m) => (m.effect as { type: string; reroll: RerollType }).reroll);
  if (rerolls.includes("ALL")) return "ALL";
  if (rerolls.includes("ONES")) return "ONES";
  return null;
};

/** Sum all EXTRA_ATTACKS values. No cap (not a roll modifier). */
export const totalExtraAttacks = (modifiers: Modifier[]): number =>
  modifiers
    .filter((m) => m.effect.type === "EXTRA_ATTACKS")
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );

/** Sum all EXTRA_DAMAGE values. No cap (not a roll modifier). */
export const totalExtraDamage = (modifiers: Modifier[]): number =>
  modifiers
    .filter((m) => m.effect.type === "EXTRA_DAMAGE")
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );

/**
 * Returns the maximum SUSTAINED_HITS value across sources.
 * Multiple sources of Sustained Hits don't stack — use the best.
 */
export const effectiveSustainedHits = (modifiers: Modifier[]): number => {
  const values = modifiers
    .filter((m) => m.effect.type === "SUSTAINED_HITS")
    .map((m) => (m.effect as { type: string; value: number }).value);
  return values.length > 0 ? Math.max(...values) : 0;
};
