import type {
  WeaponProfile,
  UnitProfile,
  WeaponAbility,
  AttackerContext,
  DefenderContext,
} from "../common/types";
import { DEFAULT_ATTACKER_CONTEXT } from "../common/types";
import type { Modifier, ModifierEffect, RerollType } from "./types";

type AbilityHandlerArgs = {
  ability: WeaponAbility;
  weapon: WeaponProfile;
  attackerContext: AttackerContext;
  defenderUnit: UnitProfile;
  defenderContext: DefenderContext;
  defenderModelCount: number;
};

type AbilityHandler = (args: AbilityHandlerArgs) => Modifier[];

const abilityHandlers: Partial<Record<string, AbilityHandler>> = {
  ANTI: ({ ability, defenderUnit }) => {
    const a = ability as Extract<WeaponAbility, { type: "ANTI" }>;
    const defKeywords = defenderUnit.keywords.map((k) => k.toUpperCase());
    if (!defKeywords.includes(a.keyword.toUpperCase())) return [];
    return [
      {
        source: `Anti-${a.keyword} ${a.threshold}+`,
        effect: { type: "CRIT_WOUND_THRESHOLD", value: a.threshold },
      },
    ];
  },

  BLAST: ({ defenderModelCount }) => [
    {
      source: "Blast",
      effect: {
        type: "EXTRA_ATTACKS",
        value: Math.floor(defenderModelCount / 5),
      },
    },
  ],

  CONVERSION: ({ attackerContext }) => {
    if (!attackerContext.atLongRange) return [];
    return [
      {
        source: "Conversion",
        effect: { type: "CRIT_HIT_THRESHOLD", value: 4 },
      },
    ];
  },

  DEVASTATING_WOUNDS: () => [
    { source: "Devastating Wounds", effect: { type: "DEVASTATING_WOUNDS" } },
  ],

  HEAVY: ({ attackerContext }) => {
    if (!attackerContext.remainedStationary) return [];
    return [
      { source: "Heavy", effect: { type: "HIT_THRESHOLD_DELTA", value: -1 } },
    ];
  },

  IGNORES_COVER: () => [
    { source: "Ignores Cover", effect: { type: "IGNORE_COVER" } },
  ],

  INDIRECT_FIRE: ({ weapon }) => {
    const hasIgnoresCover = weapon.abilities.some(
      (a) => a.type === "IGNORES_COVER",
    );
    const mods: Modifier[] = [
      {
        source: "Indirect Fire",
        effect: { type: "HIT_THRESHOLD_DELTA", value: 1 },
      },
    ];
    if (!hasIgnoresCover) {
      mods.push({
        source: "Indirect Fire (cover)",
        effect: { type: "SAVE_THRESHOLD_DELTA", value: -1 },
      });
    }
    return mods;
  },

  LANCE: ({ attackerContext }) => {
    if (!attackerContext.charged) return [];
    return [
      { source: "Lance", effect: { type: "WOUND_THRESHOLD_DELTA", value: -1 } },
    ];
  },

  LETHAL_HITS: () => [
    { source: "Lethal Hits", effect: { type: "LETHAL_HITS" } },
  ],

  MELTA: ({ ability, attackerContext }) => {
    if (!attackerContext.atHalfRange) return [];
    const a = ability as Extract<WeaponAbility, { type: "MELTA" }>;
    return [
      {
        source: `Melta (${a.value})`,
        effect: { type: "EXTRA_DAMAGE", value: a.value },
      },
    ];
  },

  RAPID_FIRE: ({ ability, attackerContext }) => {
    if (!attackerContext.atHalfRange) return [];
    const a = ability as Extract<WeaponAbility, { type: "RAPID_FIRE" }>;
    if (typeof a.value !== "number") return [];
    return [
      {
        source: `Rapid Fire (${a.value})`,
        effect: { type: "EXTRA_ATTACKS", value: a.value },
      },
    ];
  },

  SUSTAINED_HITS: ({ ability }) => {
    const a = ability as Extract<WeaponAbility, { type: "SUSTAINED_HITS" }>;
    if (typeof a.value !== "number") return [];
    return [
      {
        source: `Sustained Hits (${a.value})`,
        effect: { type: "SUSTAINED_HITS", value: a.value },
      },
    ];
  },

  TORRENT: () => [{ source: "Torrent", effect: { type: "AUTO_HIT" } }],

  TWIN_LINKED: () => [
    { source: "Twin-linked", effect: { type: "WOUND_REROLL", reroll: "ALL" } },
  ],
};

export const resolveWeaponModifiers = (
  weapon: WeaponProfile,
  attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderContext: DefenderContext,
  defenderModelCount: number,
): Modifier[] => {
  const modifiers: Modifier[] = [];

  const hasIgnoresCover = weapon.abilities.some(
    (a) => a.type === "IGNORES_COVER",
  );
  if (defenderContext.inCover && !hasIgnoresCover) {
    modifiers.push({
      source: "cover",
      effect: { type: "SAVE_THRESHOLD_DELTA", value: -1 },
    });
  }

  for (const ability of weapon.abilities) {
    const handler = abilityHandlers[ability.type];
    if (handler) {
      modifiers.push(
        ...handler({
          ability,
          weapon,
          attackerContext,
          defenderUnit,
          defenderContext,
          defenderModelCount,
        }),
      );
    }
  }

  return modifiers;
};

export const hasModifier = (
  modifiers: Modifier[],
  type: ModifierEffect["type"],
): boolean => modifiers.some((m) => m.effect.type === type);

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

export const totalExtraAttacks = (modifiers: Modifier[]): number =>
  modifiers
    .filter((m) => m.effect.type === "EXTRA_ATTACKS")
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );

export const totalExtraDamage = (modifiers: Modifier[]): number =>
  modifiers
    .filter((m) => m.effect.type === "EXTRA_DAMAGE")
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );

export const effectiveSustainedHits = (modifiers: Modifier[]): number => {
  const values = modifiers
    .filter((m) => m.effect.type === "SUSTAINED_HITS")
    .map((m) => (m.effect as { type: string; value: number }).value);
  return values.length > 0 ? Math.max(...values) : 0;
};
