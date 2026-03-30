/**
 * Dice probability primitives.
 * All functions operate on expected (average) values.
 * This module is the extension point for future probability distributions.
 */

/**
 * Probability of rolling >= threshold on a D6.
 * threshold=3 → rolling 3,4,5,6 → 4/6
 */
export function pSuccess(threshold: number): number {
  if (threshold <= 1) return 1;
  if (threshold > 6) return 0;
  return (7 - threshold) / 6;
}

/**
 * Probability of a critical (natural 6) on a D6.
 */
export const P_CRIT = 1 / 6;

/**
 * Wound roll threshold given attacker Strength vs defender Toughness.
 * Per 10th edition core rules.
 */
export function woundThreshold(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 > toughness) return 5;
  return 6;
}

/**
 * Effective save threshold after AP, clamped so it can never be better than 2+.
 * Cover adds +1 to the save stat (lower is better), so we subtract 1 from threshold.
 */
export function effectiveSaveThreshold(
  save: number,
  ap: number,
  inCover: boolean,
  invuln?: number
): number {
  const coverBonus = inCover ? 1 : 0;
  const armorSave = save + ap - coverBonus;
  const best = invuln !== undefined ? Math.min(armorSave, invuln) : armorSave;
  return Math.max(2, best); // 2+ is the hard cap
}
