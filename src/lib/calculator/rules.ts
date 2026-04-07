import { Modifier } from "./types";
import { pSuccessWithReroll, pCritWithReroll } from "./dice";
import {
  hasModifier,
  applyAndClampDelta,
  effectiveCritThreshold,
  effectiveReroll,
  effectiveSustainedHits,
} from "./modifiers";

/**
 * Intermediate state flowing through the combat pipeline.
 * We track normal and critical values separately so each rule can branch on them.
 */
export interface PipelineState {
  normalHits: number;   // hits that are NOT crits
  critHits: number;     // crit (natural 6, or lower with Conversion) hits
  normalWounds: number;
  critWounds: number;   // crit wounds — may bypass saves (Devastating Wounds)
}

/**
 * Given a number of attacks and hit threshold, compute the expected hit breakdown.
 * Accounts for AUTO_HIT (Torrent), hit threshold deltas, crit hit threshold overrides,
 * and hit rerolls.
 */
export function resolveHits(
  attacks: number,
  skill: number,
  modifiers: Modifier[],
): { normalHits: number; critHits: number; note: string } {
  if (hasModifier(modifiers, "AUTO_HIT")) {
    return {
      normalHits: attacks,
      critHits: 0,
      note: "Torrent: auto-hits, no roll required",
    };
  }

  const effectiveSkill = applyAndClampDelta(skill, modifiers, "HIT_THRESHOLD_DELTA");
  const critThreshold  = effectiveCritThreshold(modifiers, "CRIT_HIT_THRESHOLD", 6);
  const reroll         = effectiveReroll(modifiers, "HIT_REROLL");

  const pHit  = pSuccessWithReroll(effectiveSkill, reroll);
  const pCrit = pCritWithReroll(critThreshold, effectiveSkill, reroll);

  const critHits   = attacks * pCrit;
  const normalHits = Math.max(0, attacks * pHit - critHits);

  const notes: string[] = [];
  if (effectiveSkill !== skill) {
    notes.push(`Hit on ${effectiveSkill}+ (modified from ${skill}+)`);
  } else {
    notes.push(`Hit on ${effectiveSkill}+`);
  }
  if (critThreshold < 6) notes.push(`Crits on ${critThreshold}+`);
  if (reroll) notes.push(`Re-roll ${reroll === "ALL" ? "all misses" : "1s"}`);

  return { normalHits, critHits, note: notes.join("; ") };
}

/**
 * Apply all modifiers that affect the hit step output before the wound roll.
 * Currently: SUSTAINED_HITS (extra hits per crit).
 */
export function applyHitAbilities(
  state: PipelineState,
  modifiers: Modifier[],
): PipelineState {
  let { normalHits, critHits } = state;

  const sustainedValue = effectiveSustainedHits(modifiers);
  if (sustainedValue > 0) {
    normalHits += critHits * sustainedValue;
  }

  return { ...state, normalHits, critHits };
}

/**
 * How many crit hits become auto-wounds (Lethal Hits).
 */
export function lethalHitAutoWounds(critHits: number, modifiers: Modifier[]): number {
  return hasModifier(modifiers, "LETHAL_HITS") ? critHits : 0;
}

/**
 * Apply all modifiers that affect the wound step output before the save roll.
 * Extension point for future wound-modifying abilities (e.g. Poison).
 */
export function applyWoundAbilities(
  state: PipelineState,
  _modifiers: Modifier[],
): PipelineState {
  return state;
}

/**
 * How many crit wounds bypass saves (Devastating Wounds → mortal wounds).
 */
export function devastatingWoundMortals(critWounds: number, modifiers: Modifier[]): number {
  return hasModifier(modifiers, "DEVASTATING_WOUNDS") ? critWounds : 0;
}
