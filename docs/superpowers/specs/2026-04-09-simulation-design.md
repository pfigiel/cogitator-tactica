# Combat Calculator: Simulation Engine

**Date:** 2026-04-09
**Status:** Approved

## Overview

Replace the existing analytical pipeline (expected-value math) with a Monte Carlo simulation engine. Each calculation runs 10,000 trials with real dice rolls and averages the results. The output shape is unchanged — callers receive the same `CombatResult` / `WeaponResult` types. The architecture is designed to extend cleanly along three axes: new pipeline steps, new statistics, and RNG variants.

## Motivation

The analytical approach computes exact expected values but becomes increasingly difficult to maintain as the combat sequence grows (more abilities, more edge cases, more interactions). Simulation replaces probability math with discrete dice rolls, which directly mirrors the game rules and is trivially extensible to new steps. It also unlocks future statistics (stdDev, percentiles, histograms) that are hard to derive analytically.

## File Structure

```
src/lib/calculator/
  types.ts          — updated: DefenderContext added, CombatantInput.inCover replaced
  modifiers.ts      — unchanged
  index.ts          — updated: calculate() becomes async
  simulation/
    rng.ts          — Rng interface + standardRng implementation
    pipeline.ts     — StepCounts type + simulateWeaponOnce()
    runner.ts       — SIMULATION_RUNS constant + runSimulation()
```

**Deleted:** `dice.ts`, `rules.ts`, `pipeline.ts` (root-level)

## Types changes (`types.ts`)

Add `DefenderContext` alongside the existing `AttackerContext`:

```ts
export interface DefenderContext {
  inCover: boolean;
}

export const DEFAULT_DEFENDER_CONTEXT: DefenderContext = {
  inCover: false,
};
```

Replace `inCover?: boolean` on `CombatantInput` with `defenderContext?: DefenderContext`. Future defender situational flags (e.g. fortified position, in ruins) extend this interface.

## `simulation/rng.ts`

```ts
export interface Rng {
  d6(): number;                        // integer 1–6
  dice(expr: DiceExpression): number;  // resolves e.g. "2D6+1" to an integer
}

export const standardRng: Rng = { ... }; // Math.random()-based
```

The `Rng` interface is the extension point for future biased variants (optimistic, pessimistic). For now only `standardRng` is implemented. All randomness in the simulation flows through this interface — nothing calls `Math.random()` directly.

## `simulation/pipeline.ts`

```ts
interface StepCounts {
  attacks: number;
  hits: number;
  wounds: number;
  unsavedWounds: number;
  damage: number;
  modelsSlain: number;
}

function simulateWeaponOnce(
  modelCount: number,
  rng: Rng,
  weapon: WeaponProfile,
  attackerContext: AttackerContext,
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext,
): StepCounts
```

Runs one complete trial through all combat steps in sequence:

1. **Attacks** — roll `weapon.attacks` dice per model, sum
2. **Hit rolls** — roll D6 per attack; check vs skill threshold; apply rerolls, Torrent (auto-hit), Sustained Hits (extra hits per crit), Lethal Hits (crit hits are counted as hits but flagged to skip the wound roll in step 3)
3. **Wound rolls** — roll D6 per hit (excluding auto-wounds); check vs S/T threshold; apply rerolls, Anti (lower crit threshold), Devastating Wounds (crit wounds skip saves)
4. **Saving throws** — roll D6 per wound (excluding mortal wounds); check vs effective save (armour + AP + cover + invuln)
5. **Damage** — roll `weapon.damage` per unsaved wound; cap at model wounds (no spillover for normal wounds; mortal wounds from Devastating Wounds spill freely)
6. **Models slain** — integer count, tracking wounds-remaining per model within the trial

`StepCounts` stores only the **output** of each step. Since the output of step N is the input to step N+1 within a single run, the average output of step N equals the average input to step N+1 across runs — so the `input` field on each `CombatStep` in the final result is the averaged output of the previous step. No separate input tracking required.

Adding a new step = adding a field to `StepCounts` and inserting the step logic in the sequence.

## `simulation/runner.ts`

```ts
const SIMULATION_RUNS = 10_000;

async function runSimulation(
  modelCount: number,
  rng: Rng,
  weapon: WeaponProfile,
  attackerContext: AttackerContext,
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext,
): Promise<WeaponResult>
```

Loop:
```
accumulated = zero StepCounts
for i = 1..SIMULATION_RUNS:
  counts = simulateWeaponOnce(...)   // full pipeline, one trial
  accumulated += counts
averages = accumulated / SIMULATION_RUNS
```

Maps averaged `StepCounts` to `WeaponResult`:

| StepCounts field | CombatStep label   |
|------------------|--------------------|
| attacks          | "Attacks"          |
| hits             | "Hits"             |
| wounds           | "Wounds"           |
| unsavedWounds    | "Unsaved Wounds"   |
| damage           | "Damage"           |
| modelsSlain      | "Models Slain"     |

**Extension path for future statistics:** accumulate per-step arrays instead of sums, then compute stdDev, percentiles, or histograms from the arrays — no changes needed in `pipeline.ts` or `index.ts`.

## `index.ts` changes

`calculate()` becomes `async`:

```ts
export async function calculate(input: CombatInput): Promise<CombatResult>
```

`standardRng` is instantiated once in `index.ts` and passed to `runSimulation`. Future RNG overrides would be an optional parameter on `calculate()` — callers don't need to know about `Rng` unless overriding.

Internal `resolveDirection` awaits per-weapon `runSimulation` calls. Shooting/melee branching, `DirectionalResult` assembly, and `firstFighterNote` logic are otherwise unchanged.

## Extension Axes Summary

| Axis | Where to change |
|------|----------------|
| New pipeline step | `simulation/pipeline.ts` — add field to `StepCounts`, add step logic |
| New statistics (stdDev, histogram) | `simulation/runner.ts` — accumulate arrays, compute stats |
| RNG bias (optimistic/pessimistic) | `simulation/rng.ts` — add new `Rng` implementation |
| New defender situational flag | `types.ts` — add field to `DefenderContext` |

## Out of Scope

- Different RNG bias implementations (optimistic/pessimistic) — interface is in place, implementations deferred
- Per-step stdDev, percentiles, histograms — architecture supports it, deferred
- UI changes — output shape is unchanged, no UI updates required
