import { WeaponAbility } from "./types";
import { P_CRIT } from "./dice";

/**
 * Intermediate state flowing through the combat pipeline.
 * We track normal and critical values separately so each rule can branch on them.
 */
export interface PipelineState {
  normalHits: number;  // hits that are NOT crits
  critHits: number;    // crit (natural 6) hits — may bypass wound roll
  normalWounds: number;
  critWounds: number;  // crit wounds — may bypass saves (devastating wounds)
}

/**
 * Apply all weapon abilities that modify the hit step output before wound roll.
 * Input: raw hits already split into normal/crit.
 * Returns modified pipeline state.
 */
export function applyHitAbilities(
  state: PipelineState,
  abilities: WeaponAbility[]
): PipelineState {
  let { normalHits, critHits } = state;

  for (const ability of abilities) {
    if (ability.type === "SUSTAINED_HITS") {
      // Each crit hit generates `value` additional hits (non-crit)
      normalHits += critHits * ability.value;
    }
    if (ability.type === "LETHAL_HITS") {
      // Crit hits auto-wound — remove them from the hit pool, they'll be injected into wound pool
      // (handled in the shooting/melee pipeline after this function)
    }
  }

  return { ...state, normalHits, critHits };
}

/**
 * How many crit hits become auto-wounds (Lethal Hits).
 */
export function lethalHitAutoWounds(
  critHits: number,
  abilities: WeaponAbility[]
): number {
  if (abilities.some((a) => a.type === "LETHAL_HITS")) {
    return critHits;
  }
  return 0;
}

/**
 * Apply all weapon abilities that modify the wound step output before save roll.
 */
export function applyWoundAbilities(
  state: PipelineState,
  abilities: WeaponAbility[]
): PipelineState {
  // Nothing modifies wound output currently beyond Devastating Wounds tracking.
  // This is the extension point (e.g. Poison weapons).
  return state;
}

/**
 * How many crit wounds bypass saves (Devastating Wounds → mortal wounds).
 */
export function devastatingWoundMortals(
  critWounds: number,
  abilities: WeaponAbility[]
): number {
  if (abilities.some((a) => a.type === "DEVASTATING_WOUNDS")) {
    return critWounds;
  }
  return 0;
}

/**
 * Given a number of attacks and hit threshold, compute the expected hit breakdown.
 * Accounts for TORRENT (auto-hit) and splits output into normal vs crit.
 */
export function resolveHits(
  attacks: number,
  skill: number,
  abilities: WeaponAbility[]
): { normalHits: number; critHits: number; note: string } {
  if (abilities.some((a) => a.type === "TORRENT")) {
    return {
      normalHits: attacks,
      critHits: 0,
      note: "Torrent: auto-hits, no roll required",
    };
  }

  const critHits = attacks * P_CRIT;
  const normalHits = attacks * ((7 - skill) / 6) - critHits;

  return { normalHits, critHits, note: `Hit on ${skill}+` };
}
