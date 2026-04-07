/**
 * Core combat resolution pipeline shared by both shooting and melee phases.
 * Given a weapon profile + model count + defender profile + modifiers, returns a WeaponResult
 * with a detailed step breakdown and summary stats.
 */

import {
  WeaponProfile,
  UnitProfile,
  CombatStep,
  WeaponResult,
  AttackerContext,
  DEFAULT_ATTACKER_CONTEXT,
} from "./types";
import {
  pSuccess,
  woundThreshold,
  effectiveSaveThreshold,
  pSuccessWithReroll,
  pCritWithReroll,
  diceAverage,
} from "./dice";
import {
  resolveWeaponModifiers,
  applyAndClampDelta,
  effectiveCritThreshold,
  effectiveReroll,
  totalExtraAttacks,
  totalExtraDamage,
  hasModifier,
} from "./modifiers";
import {
  resolveHits,
  applyHitAbilities,
  lethalHitAutoWounds,
  applyWoundAbilities,
  devastatingWoundMortals,
} from "./rules";

export function resolveWeapon(
  modelCount: number,
  weapon: WeaponProfile,
  defenderUnit: UnitProfile,
  defenderInCover: boolean,
  attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderModelCount = 1,
): WeaponResult {
  const steps: CombatStep[] = [];

  const modifiers = resolveWeaponModifiers(
    weapon,
    attackerContext,
    defenderUnit,
    defenderInCover,
    defenderModelCount,
  );

  // ── Step 1: Attacks ──────────────────────────────────────────────────────────
  const extraAttacks = totalExtraAttacks(modifiers);
  const totalAttacks = modelCount * diceAverage(weapon.attacks) + extraAttacks;

  const attackNotes = [`${modelCount} models × ${weapon.attacks} attacks each`];
  if (extraAttacks > 0) attackNotes.push(`+${extraAttacks} extra (Rapid Fire / Blast)`);

  steps.push({
    label: "Attacks",
    input: modelCount,
    average: totalAttacks,
    note: attackNotes.join("; "),
  });

  // ── Step 2: Hit roll ─────────────────────────────────────────────────────────
  const { normalHits: rawNormal, critHits: rawCrit, note: hitNote } =
    resolveHits(totalAttacks, weapon.skill, modifiers);

  const afterHits = applyHitAbilities(
    { normalHits: rawNormal, critHits: rawCrit, normalWounds: 0, critWounds: 0 },
    modifiers,
  );

  const totalHits = afterHits.normalHits + afterHits.critHits;

  const hitNotes: string[] = [hitNote];
  if (afterHits.normalHits !== rawNormal) {
    const extra = afterHits.normalHits - rawNormal;
    hitNotes.push(`+${extra.toFixed(2)} extra hits (Sustained Hits)`);
  }

  steps.push({
    label: "Hits",
    input: totalAttacks,
    average: totalHits,
    note: hitNotes.join("; "),
  });

  // ── Step 3: Wound roll ───────────────────────────────────────────────────────
  const baseWoundThresh    = woundThreshold(weapon.strength, defenderUnit.toughness);
  const effectiveWoundThresh = applyAndClampDelta(baseWoundThresh, modifiers, "WOUND_THRESHOLD_DELTA");
  const critWoundThresh    = effectiveCritThreshold(modifiers, "CRIT_WOUND_THRESHOLD", 6);
  const woundReroll        = effectiveReroll(modifiers, "WOUND_REROLL");

  const autoWounds      = lethalHitAutoWounds(afterHits.critHits, modifiers);
  const hitsToWoundRoll = afterHits.normalHits + (afterHits.critHits - autoWounds);

  const pWound     = pSuccessWithReroll(effectiveWoundThresh, woundReroll);
  const pCritWound = pCritWithReroll(critWoundThresh, effectiveWoundThresh, woundReroll);

  const totalWoundsFromRoll = hitsToWoundRoll * pWound;
  const critWounds          = hitsToWoundRoll * pCritWound;
  const normalWounds        = totalWoundsFromRoll - critWounds;
  const totalWounds         = autoWounds + totalWoundsFromRoll;

  const afterWoundAbilities = applyWoundAbilities(
    {
      normalHits: hitsToWoundRoll,
      critHits: 0,
      normalWounds,
      critWounds: critWounds + autoWounds,
    },
    modifiers,
  );

  const woundNotes: string[] = [
    `Wound on ${effectiveWoundThresh}+` +
    (baseWoundThresh !== effectiveWoundThresh ? ` (modified from ${baseWoundThresh}+)` : "") +
    ` (S${weapon.strength} vs T${defenderUnit.toughness})`,
  ];
  if (critWoundThresh < 6) woundNotes.push(`Critical wound on ${critWoundThresh}+`);
  if (autoWounds > 0) woundNotes.push(`+${autoWounds.toFixed(2)} auto-wounds (Lethal Hits)`);
  if (woundReroll) woundNotes.push(`Re-roll ${woundReroll === "ALL" ? "all misses" : "1s"} (Twin-linked)`);

  steps.push({
    label: "Wounds",
    input: totalHits,
    average: totalWounds,
    note: woundNotes.join("; "),
  });

  // ── Step 4: Saving throw ─────────────────────────────────────────────────────
  const saveCritWounds    = devastatingWoundMortals(afterWoundAbilities.critWounds, modifiers);
  const woundsRequiringSave = totalWounds - saveCritWounds;

  const saveThresh   = effectiveSaveThreshold(defenderUnit.save, weapon.ap, modifiers, defenderUnit.invuln);
  const failSaveProb = 1 - pSuccess(saveThresh);
  const totalUnsaved = woundsRequiringSave * failSaveProb + saveCritWounds;

  const inCoverNote = hasModifier(modifiers, "SAVE_THRESHOLD_DELTA") ? ", in cover" : "";
  const saveNotes: string[] = [
    `Save on ${saveThresh}+ (${defenderUnit.save}+ armor, AP-${weapon.ap}${inCoverNote}` +
    (defenderUnit.invuln ? `, ${defenderUnit.invuln}+ invuln` : "") + ")",
  ];
  if (saveCritWounds > 0)
    saveNotes.push(`+${saveCritWounds.toFixed(2)} mortal wounds bypass saves (Devastating Wounds)`);

  steps.push({
    label: "Unsaved Wounds",
    input: totalWounds,
    average: totalUnsaved,
    note: saveNotes.join("; "),
  });

  // ── Step 5: Damage ───────────────────────────────────────────────────────────
  const extraDamage    = totalExtraDamage(modifiers);
  const damagePerWound = diceAverage(weapon.damage) + extraDamage;
  const averageDamage  = totalUnsaved * damagePerWound;

  const damageNotes = [`${damagePerWound} damage per unsaved wound`];
  if (extraDamage > 0) damageNotes.push(`+${extraDamage} from Melta`);

  steps.push({
    label: "Damage",
    input: totalUnsaved,
    average: averageDamage,
    note: damageNotes.join("; "),
  });

  // ── Step 6: Models slain ─────────────────────────────────────────────────────
  const averageModelsSlain = averageDamage / defenderUnit.wounds;

  steps.push({
    label: "Models Slain",
    input: averageDamage,
    average: averageModelsSlain,
    note: `${defenderUnit.wounds} wound(s) per model`,
  });

  return {
    weaponName: weapon.name,
    modelCount,
    steps,
    averageDamage,
    averageModelsSlain,
  };
}
