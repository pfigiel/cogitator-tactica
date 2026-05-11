import {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "../types";
import {
  resolveWeaponModifiers,
  hasModifier,
  applyAndClampDelta,
  effectiveCritThreshold,
  effectiveReroll,
  totalExtraAttacks,
  totalExtraDamage,
  effectiveSustainedHits,
} from "../modifiers";
import { Rng } from "./rng";

export type StepCounts = {
  attacks: number;
  hits: number;
  wounds: number;
  unsavedWounds: number;
  damage: number;
  modelsSlain: number;
};

/** S vs T wound threshold per 10th edition core rules. */
const woundThreshold = (strength: number, toughness: number): number => {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 > toughness) return 5;
  return 6;
};

const rollWithReroll = (
  rng: Rng,
  reroll: "ONES" | "ALL" | null,
  threshold: number,
): number => {
  const roll = rng.d6();
  if (reroll === "ALL" && roll < threshold) return rng.d6();
  if (reroll === "ONES" && roll === 1) return rng.d6();
  return roll;
};

/**
 * Simulate one trial of a weapon attack against a defender.
 * @param defenderModelCount - Full model count of the defending unit at the start of this trial.
 *   Used by BLAST ability (extra attacks per 5 models). Do not pass a running casualty count.
 */
export const simulateWeaponOnce = (
  rng: Rng,
  weapon: WeaponProfile,
  attackerModelCount: number,
  attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext = DEFAULT_DEFENDER_CONTEXT,
): StepCounts => {
  const modifiers = resolveWeaponModifiers(
    weapon,
    attackerContext,
    defenderUnit,
    defenderContext.inCover,
    defenderModelCount,
  );

  // ── Step 1: Attacks ──────────────────────────────────────────────────────────
  const extraAttacks = totalExtraAttacks(modifiers);
  let totalAttacks = extraAttacks;
  for (let i = 0; i < attackerModelCount; i++) {
    totalAttacks += rng.dice(weapon.attacks);
  }

  // ── Step 2: Hit rolls ─────────────────────────────────────────────────────────
  const isAutoHit = hasModifier(modifiers, "AUTO_HIT");
  const hitThreshold = applyAndClampDelta(
    weapon.skill,
    modifiers,
    "HIT_THRESHOLD_DELTA",
  );
  const critHitThreshold = effectiveCritThreshold(
    modifiers,
    "CRIT_HIT_THRESHOLD",
    6,
  );
  const hitReroll = effectiveReroll(modifiers, "HIT_REROLL");
  const sustainedHitsValue = effectiveSustainedHits(modifiers);
  const hasLethalHits = hasModifier(modifiers, "LETHAL_HITS");

  let normalHits = 0;
  let critHits = 0;

  if (isAutoHit) {
    normalHits = totalAttacks;
  } else {
    for (let i = 0; i < totalAttacks; i++) {
      const roll = rollWithReroll(rng, hitReroll, hitThreshold);
      if (roll >= hitThreshold) {
        if (roll >= critHitThreshold) {
          critHits++;
          normalHits += sustainedHitsValue; // Sustained Hits: extra normal hits per crit
        } else {
          normalHits++;
        }
      }
    }
  }

  const totalHits = normalHits + critHits;

  // ── Step 3: Wound rolls ───────────────────────────────────────────────────────
  const baseWoundThresh = woundThreshold(
    rng.dice(weapon.strength),
    defenderUnit.toughness,
  );
  const effectiveWoundThresh = applyAndClampDelta(
    baseWoundThresh,
    modifiers,
    "WOUND_THRESHOLD_DELTA",
  );
  const critWoundThreshold = effectiveCritThreshold(
    modifiers,
    "CRIT_WOUND_THRESHOLD",
    6,
  );
  const woundReroll = effectiveReroll(modifiers, "WOUND_REROLL");
  const hasDevastatingWounds = hasModifier(modifiers, "DEVASTATING_WOUNDS");

  // Lethal Hits: crit hits skip the wound roll and become auto-wounds
  const autoWounds = hasLethalHits ? critHits : 0;
  const hitsToWoundRoll = normalHits + (hasLethalHits ? 0 : critHits);

  let normalWounds = 0;
  let mortalWounds = 0; // from Devastating Wounds — bypass saves

  for (let i = 0; i < hitsToWoundRoll; i++) {
    const roll = rollWithReroll(rng, woundReroll, effectiveWoundThresh);
    if (roll >= effectiveWoundThresh) {
      if (roll >= critWoundThreshold && hasDevastatingWounds) {
        mortalWounds++;
      } else {
        normalWounds++;
      }
    }
  }

  const totalWounds = autoWounds + normalWounds + mortalWounds;

  // ── Step 4: Saving throws ─────────────────────────────────────────────────────
  // Mortal wounds (Devastating Wounds) bypass saves. Auto-wounds and normal wounds require saves.
  const armorSave = applyAndClampDelta(
    defenderUnit.save + weapon.ap,
    modifiers,
    "SAVE_THRESHOLD_DELTA",
  );
  const invuln = defenderUnit.invuln;
  const effectiveInvuln =
    invuln !== undefined
      ? applyAndClampDelta(invuln, modifiers, "INVULN_THRESHOLD_DELTA")
      : undefined;
  const saveThreshold = Math.max(
    2,
    effectiveInvuln !== undefined
      ? Math.min(armorSave, effectiveInvuln)
      : armorSave,
  );

  const woundsRequiringSave = autoWounds + normalWounds;
  let unsavedNormal = 0;
  for (let i = 0; i < woundsRequiringSave; i++) {
    if (rng.d6() < saveThreshold) {
      unsavedNormal++;
    }
  }

  const totalUnsaved = unsavedNormal + mortalWounds;

  // ── Step 5 & 6: Damage allocation and models slain ───────────────────────────
  // Track individual model health pools for accurate model-slain count.
  // Normal wounds: damage capped at remaining model health (no spillover).
  // Mortal wounds: damage spills across model boundaries.
  const extraDamage = totalExtraDamage(modifiers);
  let totalDamage = 0;
  let modelsSlain = 0;
  let remainingHealth = defenderUnit.wounds;

  for (let i = 0; i < unsavedNormal && modelsSlain < defenderModelCount; i++) {
    const rawDmg = rng.dice(weapon.damage) + extraDamage;
    const dmg = Math.min(rawDmg, remainingHealth); // cap — no spillover
    remainingHealth -= dmg;
    totalDamage += dmg;
    if (remainingHealth <= 0) {
      modelsSlain++;
      remainingHealth = defenderUnit.wounds;
    }
  }

  for (let i = 0; i < mortalWounds && modelsSlain < defenderModelCount; i++) {
    let dmg = rng.dice(weapon.damage) + extraDamage;
    totalDamage += dmg;
    while (dmg > 0 && modelsSlain < defenderModelCount) {
      const applied = Math.min(dmg, remainingHealth);
      remainingHealth -= applied;
      dmg -= applied;
      if (remainingHealth <= 0) {
        modelsSlain++;
        remainingHealth = defenderUnit.wounds;
      }
    }
  }

  return {
    attacks: totalAttacks,
    hits: totalHits,
    wounds: totalWounds,
    unsavedWounds: totalUnsaved,
    damage: totalDamage,
    modelsSlain,
  };
};
