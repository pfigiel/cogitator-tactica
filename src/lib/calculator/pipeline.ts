/**
 * Core combat resolution pipeline shared by both shooting and melee phases.
 * Given an attacker weapon profile + model count + defender profile, returns
 * a list of CombatSteps and summary stats.
 */

import { WeaponProfile, UnitProfile, CombatStep, DirectionalResult } from "./types";
import {
  pSuccess,
  P_CRIT,
  woundThreshold,
  effectiveSaveThreshold,
} from "./dice";
import {
  resolveHits,
  applyHitAbilities,
  lethalHitAutoWounds,
  applyWoundAbilities,
  devastatingWoundMortals,
} from "./rules";

export function resolveCombat(
  attackerUnit: UnitProfile,
  attackerCount: number,
  attackerWeapon: WeaponProfile,
  defenderUnit: UnitProfile,
  defenderInCover: boolean
): DirectionalResult {
  const steps: CombatStep[] = [];

  // ── Step 1: Attacks ────────────────────────────────────────────────────────
  const totalAttacks = attackerCount * attackerWeapon.attacks;
  steps.push({
    label: "Attacks",
    input: attackerCount,
    average: totalAttacks,
    note: `${attackerCount} models × ${attackerWeapon.attacks} attacks each`,
  });

  // ── Step 2: Hit roll ───────────────────────────────────────────────────────
  const { normalHits: rawNormal, critHits: rawCrit, note: hitNote } =
    resolveHits(totalAttacks, attackerWeapon.skill, attackerWeapon.abilities);

  const afterHitAbilities = applyHitAbilities(
    { normalHits: rawNormal, critHits: rawCrit, normalWounds: 0, critWounds: 0 },
    attackerWeapon.abilities
  );

  const totalHits = afterHitAbilities.normalHits + afterHitAbilities.critHits;

  const hitNotes: string[] = [hitNote];
  if (afterHitAbilities.normalHits !== rawNormal) {
    const extra = afterHitAbilities.normalHits - rawNormal;
    hitNotes.push(`+${extra.toFixed(2)} from Sustained Hits`);
  }

  steps.push({
    label: "Hits",
    input: totalAttacks,
    average: totalHits,
    note: hitNotes.join("; "),
  });

  // ── Step 3: Wound roll ─────────────────────────────────────────────────────
  const woundThresh = woundThreshold(attackerWeapon.strength, defenderUnit.toughness);

  // Lethal hits auto-wound (crit hits)
  const autoWounds = lethalHitAutoWounds(afterHitAbilities.critHits, attackerWeapon.abilities);
  const hitsToWoundRoll = afterHitAbilities.normalHits + (afterHitAbilities.critHits - autoWounds);

  const normalWoundProb = pSuccess(woundThresh);
  const normalWounds = hitsToWoundRoll * normalWoundProb;
  // Of those wounds, 1/6 are crits (natural 6 on the wound roll)
  const critWounds = hitsToWoundRoll * P_CRIT;
  const adjustedNormalWounds = normalWounds - critWounds;

  const totalWounds = autoWounds + normalWounds;

  const woundNotes: string[] = [`Wound on ${woundThresh}+ (S${attackerWeapon.strength} vs T${defenderUnit.toughness})`];
  if (autoWounds > 0) woundNotes.push(`+${autoWounds.toFixed(2)} auto-wounds (Lethal Hits)`);

  const afterWoundAbilities = applyWoundAbilities(
    {
      normalHits: hitsToWoundRoll,
      critHits: 0,
      normalWounds: adjustedNormalWounds,
      critWounds: critWounds + autoWounds,
    },
    attackerWeapon.abilities
  );

  steps.push({
    label: "Wounds",
    input: totalHits,
    average: totalWounds,
    note: woundNotes.join("; "),
  });

  // ── Step 4: Saving throw ───────────────────────────────────────────────────
  const saveCritWounds = devastatingWoundMortals(
    afterWoundAbilities.critWounds,
    attackerWeapon.abilities
  );
  const woundsRequiringSave = totalWounds - saveCritWounds;

  const saveThresh = effectiveSaveThreshold(
    defenderUnit.save,
    attackerWeapon.ap,
    defenderInCover,
    defenderUnit.invuln
  );
  const failSaveProb = 1 - pSuccess(saveThresh);
  const unsavedFromRoll = woundsRequiringSave * failSaveProb;
  const totalUnsaved = unsavedFromRoll + saveCritWounds;

  const saveNotes: string[] = [`Save on ${saveThresh}+ (${defenderUnit.save}+ save, AP-${attackerWeapon.ap}${defenderInCover ? ", in cover" : ""})`];
  if (saveCritWounds > 0)
    saveNotes.push(`+${saveCritWounds.toFixed(2)} mortals bypass saves (Devastating Wounds)`);

  steps.push({
    label: "Unsaved Wounds",
    input: totalWounds,
    average: totalUnsaved,
    note: saveNotes.join("; "),
  });

  // ── Step 5: Damage ─────────────────────────────────────────────────────────
  const averageDamage = totalUnsaved * attackerWeapon.damage;

  steps.push({
    label: "Damage",
    input: totalUnsaved,
    average: averageDamage,
    note: `${attackerWeapon.damage} damage per unsaved wound`,
  });

  // ── Step 6: Models slain ───────────────────────────────────────────────────
  const averageModelsSlain = Math.min(
    averageDamage / defenderUnit.wounds,
    defenderUnit.wounds > 0 ? Infinity : 0
  );

  steps.push({
    label: "Models Slain",
    input: averageDamage,
    average: averageModelsSlain,
    note: `${defenderUnit.wounds} wound(s) per model`,
  });

  return {
    attackerName: `${attackerUnit.name} (${attackerCount})`,
    defenderName: defenderUnit.name,
    steps,
    averageDamage,
    averageModelsSlain,
  };
}
