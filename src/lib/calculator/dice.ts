/**
 * Dice probability primitives.
 * All functions operate on expected (average) values.
 * This module is the extension point for future probability distributions.
 */

import { Modifier, RerollType, DiceExpression } from "./types";
import { applyAndClampDelta } from "./modifiers";

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
 * Probability of a successful D6 roll, optionally with rerolls.
 *
 * - ONES: reroll natural 1s (1s always fail, so P = base + (1/6) × base)
 * - ALL:  reroll all failures (P = base + (1 − base) × base)
 */
export function pSuccessWithReroll(threshold: number, reroll: RerollType | null): number {
  const base = pSuccess(threshold);
  if (!reroll) return base;
  if (reroll === "ONES") return Math.min(1, base + (1 / 6) * base);
  // ALL: reroll every failed die
  return Math.min(1, base + (1 - base) * base);
}

/**
 * Probability of a critical result on a D6 roll, optionally with rerolls.
 *
 * @param critThreshold  - roll must be >= this to count as a crit (default 6; lower with e.g. Conversion/Anti)
 * @param rollThreshold  - the hit/wound threshold — determines which dice are failures for REROLL_ALL
 * @param reroll         - optional reroll applied to the overall roll
 *
 * - ONES: reroll natural 1s → P(crit) = pSuccess(critThreshold) + (1/6) × pSuccess(critThreshold)
 * - ALL:  reroll failures   → P(crit) = pSuccess(critThreshold) + (1 − pSuccess(rollThreshold)) × pSuccess(critThreshold)
 */
export function pCritWithReroll(
  critThreshold: number,
  rollThreshold: number,
  reroll: RerollType | null,
): number {
  const pCritBase = pSuccess(critThreshold);
  if (!reroll) return pCritBase;
  if (reroll === "ONES") return Math.min(1, pCritBase + (1 / 6) * pCritBase);
  // ALL: only failed rolls (didn't meet rollThreshold) get rerolled
  return Math.min(1, pCritBase + (1 - pSuccess(rollThreshold)) * pCritBase);
}

/**
 * Effective save threshold after AP and modifiers (e.g. cover, invuln improvements).
 *
 * Accepts Modifier[] instead of a bare inCover boolean so that any source
 * (cover, Indirect Fire, auras, stratagems, etc.) feeds in uniformly.
 * Clamped so it can never be better than 2+.
 */
export function effectiveSaveThreshold(
  save: number,
  ap: number,
  modifiers: Modifier[],
  invuln?: number,
): number {
  // applyAndClampDelta handles the sum-then-clamp rule for SAVE_THRESHOLD_DELTA
  const armorSave = applyAndClampDelta(save + ap, modifiers, "SAVE_THRESHOLD_DELTA");

  if (invuln !== undefined) {
    const effectiveInvuln = applyAndClampDelta(invuln, modifiers, "INVULN_THRESHOLD_DELTA");
    return Math.max(2, Math.min(armorSave, effectiveInvuln));
  }

  return Math.max(2, armorSave);
}

/**
 * Returns the expected (average) value of a DiceExpression.
 * Numbers pass through unchanged.
 * Valid string formats: D3, D6, 2D6, D3+3, D6+1, etc.
 * Throws if the expression is not a valid pattern — validate at import time, not here.
 */
export function diceAverage(expr: DiceExpression): number {
  if (typeof expr === "number") return expr;
  const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i);
  if (!match) throw new Error(`Invalid DiceExpression: "${expr}"`);
  const multiplier = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  return multiplier * ((1 + sides) / 2) + modifier;
}
