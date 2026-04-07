/**
 * Dice probability primitives.
 * All functions operate on expected (average) values.
 * This module is the extension point for future probability distributions.
 */

import { DiceExpression } from "./types";

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
