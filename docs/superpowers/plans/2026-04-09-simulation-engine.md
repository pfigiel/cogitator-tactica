# Simulation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the analytical combat calculator with a Monte Carlo simulation engine that runs 10,000 trials with real dice rolls and returns the same output shape.

**Architecture:** A thin `Rng` interface abstracts randomness (enabling future biased variants). `simulateWeaponOnce()` runs one complete trial through all combat steps. `runSimulation()` aggregates N trials into `WeaponResult`. The public `calculate()` API becomes `async` but its input/output types are otherwise unchanged.

**Tech Stack:** TypeScript, Vitest (new), Next.js (unchanged)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `vitest.config.ts` | Vitest configuration with `@/` path alias |
| Modify | `package.json` | Add test scripts and vitest dependency |
| Modify | `src/lib/calculator/types.ts` | Add `DefenderContext` / `DEFAULT_DEFENDER_CONTEXT`; replace `inCover?: boolean` on `CombatantInput` |
| Create | `src/lib/calculator/simulation/rng.ts` | `Rng` interface + `standardRng` |
| Create | `src/lib/calculator/simulation/pipeline.ts` | `StepCounts` + `simulateWeaponOnce()` |
| Create | `src/lib/calculator/simulation/runner.ts` | `SIMULATION_RUNS` + `runSimulation()` |
| Modify | `src/lib/calculator/index.ts` | `calculate()` → `async`, delegate to `runSimulation` |
| Modify | `src/app/page.tsx` | Await `calculate()`, use `defenderContext` |
| Delete | `src/lib/calculator/dice.ts` | Replaced by simulation |
| Delete | `src/lib/calculator/rules.ts` | Replaced by simulation |
| Delete | `src/lib/calculator/pipeline.ts` | Replaced by simulation |
| Create | `src/lib/calculator/simulation/rng.test.ts` | Tests for `rng.ts` |
| Create | `src/lib/calculator/simulation/pipeline.test.ts` | Tests for `pipeline.ts` |
| Create | `src/lib/calculator/simulation/runner.test.ts` | Tests for `runner.ts` |

---

## Task 1: Install Vitest and configure test runner

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest
```

Expected: vitest appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Verify vitest runs**

```bash
npm test
```

Expected: `No test files found` (or similar — no failures).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Add DefenderContext to types.ts

**Files:**
- Modify: `src/lib/calculator/types.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/calculator/simulation/pipeline.test.ts` with just the import to verify the type exists (will be expanded in Task 4):

```ts
import { DefenderContext, DEFAULT_DEFENDER_CONTEXT } from "@/lib/calculator/types";

describe("DefenderContext", () => {
  it("DEFAULT_DEFENDER_CONTEXT has inCover false", () => {
    expect(DEFAULT_DEFENDER_CONTEXT.inCover).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `DefenderContext` not exported from types.

- [ ] **Step 3: Add DefenderContext to types.ts**

In `src/lib/calculator/types.ts`, add after the `DEFAULT_ATTACKER_CONTEXT` block:

```ts
export interface DefenderContext {
  inCover: boolean;
}

export const DEFAULT_DEFENDER_CONTEXT: DefenderContext = {
  inCover: false,
};
```

Then in `CombatantInput`, replace:
```ts
  inCover?: boolean;
```
with:
```ts
  defenderContext?: DefenderContext;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator/types.ts src/lib/calculator/simulation/pipeline.test.ts
git commit -m "feat: add DefenderContext to types"
```

---

## Task 3: Create simulation/rng.ts

**Files:**
- Create: `src/lib/calculator/simulation/rng.ts`
- Create: `src/lib/calculator/simulation/rng.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/calculator/simulation/rng.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { standardRng } from "@/lib/calculator/simulation/rng";

describe("standardRng.d6", () => {
  it("returns an integer between 1 and 6 inclusive", () => {
    for (let i = 0; i < 200; i++) {
      const result = standardRng.d6();
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });
});

describe("standardRng.dice", () => {
  it("returns the number unchanged for a numeric expression", () => {
    expect(standardRng.dice(0)).toBe(0);
    expect(standardRng.dice(3)).toBe(3);
    expect(standardRng.dice(10)).toBe(10);
  });

  it("dice('D6') returns integer in [1, 6]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D6");
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });

  it("dice('D3') returns integer in [1, 3]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D3");
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(3);
    }
  });

  it("dice('2D6') returns integer in [2, 12]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("2D6");
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(12);
    }
  });

  it("dice('D6+1') returns integer in [2, 7]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D6+1");
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(7);
    }
  });

  it("dice('D3-1') returns integer in [0, 2]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D3-1");
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(2);
    }
  });

  it("throws on an invalid dice expression", () => {
    expect(() => standardRng.dice("D8")).toThrow('Invalid DiceExpression: "D8"');
    expect(() => standardRng.dice("D10+1")).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `standardRng` not found.

- [ ] **Step 3: Implement simulation/rng.ts**

Create `src/lib/calculator/simulation/rng.ts`:

```ts
import { DiceExpression } from "../types";

export interface Rng {
  d6(): number;
  dice(expr: DiceExpression): number;
}

export const standardRng: Rng = {
  d6(): number {
    return Math.floor(Math.random() * 6) + 1;
  },

  dice(expr: DiceExpression): number {
    if (typeof expr === "number") return expr;
    const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i);
    if (!match) throw new Error(`Invalid DiceExpression: "${expr}"`);
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total + modifier;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all rng tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator/simulation/rng.ts src/lib/calculator/simulation/rng.test.ts
git commit -m "feat: add Rng interface and standardRng implementation"
```

---

## Task 4: Create simulation/pipeline.ts

**Files:**
- Create: `src/lib/calculator/simulation/pipeline.ts`
- Modify: `src/lib/calculator/simulation/pipeline.test.ts`

### Test helpers (used throughout pipeline.test.ts)

The tests use a deterministic `Rng` that always returns the same value, making outcomes predictable.

```ts
// Helper: always rolls `value` on d6; dice expressions multiply by value
function alwaysRoll(value: number): Rng {
  return {
    d6: () => value,
    dice: (expr) => {
      if (typeof expr === "number") return expr;
      const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const modifier = match[3] ? parseInt(match[3], 10) : 0;
      return count * value + modifier;
    },
  };
}
```

### Unit/weapon fixtures used in tests

```ts
const infantry: UnitProfile = {
  id: "infantry", name: "Infantry",
  toughness: 4, save: 4, wounds: 1, keywords: [],
  shootingWeapons: [], meleeWeapons: [],
};

const tankProfile: UnitProfile = {
  id: "tank", name: "Tank",
  toughness: 8, save: 2, wounds: 10, keywords: ["VEHICLE"],
  shootingWeapons: [], meleeWeapons: [],
};

const basicWeapon: WeaponProfile = {
  name: "Bolter", attacks: 1, skill: 3, strength: 4, ap: 0, damage: 1, abilities: [],
};
```

- [ ] **Step 1: Write the failing tests**

Replace the content of `src/lib/calculator/simulation/pipeline.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DefenderContext, DEFAULT_DEFENDER_CONTEXT, DEFAULT_ATTACKER_CONTEXT, UnitProfile, WeaponProfile } from "@/lib/calculator/types";
import { simulateWeaponOnce } from "@/lib/calculator/simulation/pipeline";
import { Rng } from "@/lib/calculator/simulation/rng";

function alwaysRoll(value: number): Rng {
  return {
    d6: () => value,
    dice: (expr) => {
      if (typeof expr === "number") return expr;
      const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const modifier = match[3] ? parseInt(match[3], 10) : 0;
      return count * value + modifier;
    },
  };
}

const infantry: UnitProfile = {
  id: "infantry", name: "Infantry",
  toughness: 4, save: 4, wounds: 1, keywords: [],
  shootingWeapons: [], meleeWeapons: [],
};

const tankProfile: UnitProfile = {
  id: "tank", name: "Tank",
  toughness: 8, save: 2, wounds: 10, keywords: ["VEHICLE"],
  shootingWeapons: [], meleeWeapons: [],
};

const basicWeapon: WeaponProfile = {
  name: "Bolter", attacks: 1, skill: 3, strength: 4, ap: 0, damage: 1, abilities: [],
};

describe("simulateWeaponOnce", () => {
  it("all rolls of 6: 1 model scores 1 attack, hits, wounds, fails save, deals 1 damage, slays 1 model", () => {
    // S4 vs T4 → wounds on 4+; save 4+ with AP0 → fails on 1-3, so roll of 6 fails save (6 >= 4, so saved?)
    // Wait: save threshold 4+. Roll of 6 >= 4 → SAVED. Let's use AP2 to force failure.
    const weapon: WeaponProfile = { ...basicWeapon, ap: 2 }; // save becomes 6+, roll 6 = saved. Use AP3.
    const weapon2: WeaponProfile = { ...basicWeapon, ap: 3 }; // save 4+3=7 → capped at 2+ by max... 
    // Actually: effectiveSave = max(2, save + ap) = max(2, 4+3) = 7 → roll 6 < 7 → FAIL save. Good.
    const weapon3: WeaponProfile = { ...basicWeapon, ap: 3 };
    const result = simulateWeaponOnce(
      alwaysRoll(6), weapon3, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.attacks).toBe(1);
    expect(result.hits).toBe(1);
    expect(result.wounds).toBe(1);
    expect(result.unsavedWounds).toBe(1);
    expect(result.damage).toBe(1);
    expect(result.modelsSlain).toBe(1);
  });

  it("all rolls of 1: no hits, no wounds, no damage", () => {
    const result = simulateWeaponOnce(
      alwaysRoll(1), basicWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.attacks).toBe(1);
    expect(result.hits).toBe(0);
    expect(result.wounds).toBe(0);
    expect(result.unsavedWounds).toBe(0);
    expect(result.damage).toBe(0);
    expect(result.modelsSlain).toBe(0);
  });

  it("TORRENT weapon auto-hits regardless of roll value", () => {
    const torrent: WeaponProfile = {
      ...basicWeapon, attacks: 3, ap: 3,
      abilities: [{ type: "TORRENT" }],
    };
    const result = simulateWeaponOnce(
      alwaysRoll(1), torrent, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    // Roll of 1 would normally miss, but TORRENT auto-hits
    // Roll of 1 wounds? S4 vs T4 → wound on 4+. Roll 1 < 4 → no wound.
    expect(result.attacks).toBe(3);
    expect(result.hits).toBe(3);
    expect(result.wounds).toBe(0);
  });

  it("LETHAL_HITS: crit hits (6s) become auto-wounds, skipping the wound roll", () => {
    // alwaysRoll(6): all attacks are crits → all auto-wound via Lethal Hits
    // S1 vs T4 would normally wound on 6+, but Lethal Hits bypasses that roll
    const lethalWeapon: WeaponProfile = {
      ...basicWeapon, attacks: 2, strength: 1, ap: 3,
      abilities: [{ type: "LETHAL_HITS" }],
    };
    const result = simulateWeaponOnce(
      alwaysRoll(6), lethalWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.hits).toBe(2);
    // Both crit hits become auto-wounds even though S1 vs T4 would never wound on a normal roll
    expect(result.wounds).toBe(2);
    expect(result.unsavedWounds).toBe(2);
  });

  it("DEVASTATING_WOUNDS: crit wounds (6s) bypass saving throws", () => {
    // S4 vs T4 → wound on 4+. With always-roll-6, all wounds are crits.
    // Infantry has 4+ save. Normally some saves pass, but Devastating Wounds skips saves entirely.
    const devastatingWeapon: WeaponProfile = {
      ...basicWeapon, attacks: 2,
      abilities: [{ type: "DEVASTATING_WOUNDS" }],
    };
    const result = simulateWeaponOnce(
      alwaysRoll(6), devastatingWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.hits).toBe(2);
    expect(result.wounds).toBe(2);
    // All wounds are crit wounds → bypass saves → all unsaved
    expect(result.unsavedWounds).toBe(2);
  });

  it("normal wounds: damage is capped at remaining model wounds (no spillover)", () => {
    // 1 wound model, weapon deals 3 damage per wound → only 1 damage applied
    const heavyWeapon: WeaponProfile = { ...basicWeapon, ap: 3, damage: 3 };
    const result = simulateWeaponOnce(
      alwaysRoll(6), heavyWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.unsavedWounds).toBe(1);
    // damage capped at 1 (model has 1 wound), not 3
    expect(result.damage).toBe(1);
    expect(result.modelsSlain).toBe(1);
  });

  it("model health tracking: 2 attacks of 5 damage vs 10-wound tank, all hit/wound/fail save", () => {
    const multiDmg: WeaponProfile = { ...basicWeapon, attacks: 2, ap: 3, damage: 5, strength: 10 };
    const result = simulateWeaponOnce(
      alwaysRoll(6), multiDmg, 1, DEFAULT_ATTACKER_CONTEXT,
      tankProfile, 1, DEFAULT_DEFENDER_CONTEXT,
    );
    // Tank has 10 wounds. Two hits of 5 damage = 10 damage total → 1 model slain
    expect(result.modelsSlain).toBe(1);
    expect(result.damage).toBe(10);
  });

  it("multiple models: 3 attackerModelCount multiplies attacks", () => {
    const result = simulateWeaponOnce(
      alwaysRoll(6), { ...basicWeapon, ap: 3 }, 3, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.attacks).toBe(3);
  });

  it("defender in cover: save roll that fails without cover passes with cover", () => {
    // weapon: skill 3+, S8 vs T4 → wound on 3+, AP0 → armor save 4+
    // alwaysRoll(3): roll 3 >= 3 → hit; roll 3 >= 3 → wound
    // without cover: save 4+, roll 3 < 4 → fails save → 1 unsaved wound
    // in cover: save 3+ (4 − 1), roll 3 >= 3 → saves → 0 unsaved wounds
    const highStrWeapon: WeaponProfile = { ...basicWeapon, strength: 8, ap: 0 };

    const withCover = simulateWeaponOnce(
      alwaysRoll(3), highStrWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, { inCover: true },
    );
    const noCover = simulateWeaponOnce(
      alwaysRoll(3), highStrWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );

    expect(withCover.hits).toBe(1);
    expect(withCover.wounds).toBe(1);
    expect(withCover.unsavedWounds).toBe(0);   // saved by cover

    expect(noCover.hits).toBe(1);
    expect(noCover.wounds).toBe(1);
    expect(noCover.unsavedWounds).toBe(1);     // failed save without cover
  });

  it("ANTI + DEVASTATING_WOUNDS: crit wounds on matching keyword bypass saves", () => {
    // Weapon: ANTI-VEHICLE 4+, DEVASTATING_WOUNDS
    // Defender: VEHICLE keyword, save 2+ (very good save that would normally block everything)
    // alwaysRoll(6): hits (6 >= 3), wounds vs T8 (need 6+ for S4 vs T8; roll 6 = crit wound via Anti 4+)
    // Devastating Wounds: crit wounds bypass saves entirely
    const antiWeapon: WeaponProfile = {
      ...basicWeapon, attacks: 2, strength: 4, ap: 0,
      abilities: [
        { type: "ANTI", keyword: "VEHICLE", threshold: 4 },
        { type: "DEVASTATING_WOUNDS" },
      ],
    };
    const vehicle: UnitProfile = {
      id: "vehicle", name: "Vehicle",
      toughness: 8, save: 2, wounds: 1, keywords: ["VEHICLE"],
      shootingWeapons: [], meleeWeapons: [],
    };

    const result = simulateWeaponOnce(
      alwaysRoll(6), antiWeapon, 1, DEFAULT_ATTACKER_CONTEXT,
      vehicle, 10, DEFAULT_DEFENDER_CONTEXT,
    );

    expect(result.hits).toBe(2);
    expect(result.wounds).toBe(2);
    // Both wounds are crit wounds (roll 6 >= Anti threshold 4) → bypass 2+ save
    expect(result.unsavedWounds).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/lib/calculator/simulation/pipeline.test.ts
```

Expected: FAIL — `simulateWeaponOnce` not found.

- [ ] **Step 3: Implement simulation/pipeline.ts**

Create `src/lib/calculator/simulation/pipeline.ts`:

```ts
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

export interface StepCounts {
  attacks: number;
  hits: number;
  wounds: number;
  unsavedWounds: number;
  damage: number;
  modelsSlain: number;
}

/** S vs T wound threshold per 10th edition core rules. */
function woundThreshold(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 > toughness) return 5;
  return 6;
}

function rollWithReroll(
  rng: Rng,
  reroll: "ONES" | "ALL" | null,
  threshold: number,
): number {
  let roll = rng.d6();
  if (reroll === "ALL" && roll < threshold) return rng.d6();
  if (reroll === "ONES" && roll === 1) return rng.d6();
  return roll;
}

export function simulateWeaponOnce(
  rng: Rng,
  weapon: WeaponProfile,
  attackerModelCount: number,
  attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext = DEFAULT_DEFENDER_CONTEXT,
): StepCounts {
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
  const hitThreshold = applyAndClampDelta(weapon.skill, modifiers, "HIT_THRESHOLD_DELTA");
  const critHitThreshold = effectiveCritThreshold(modifiers, "CRIT_HIT_THRESHOLD", 6);
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
  const baseWoundThresh = woundThreshold(weapon.strength, defenderUnit.toughness);
  const effectiveWoundThresh = applyAndClampDelta(baseWoundThresh, modifiers, "WOUND_THRESHOLD_DELTA");
  const critWoundThreshold = effectiveCritThreshold(modifiers, "CRIT_WOUND_THRESHOLD", 6);
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
  const armorSave = applyAndClampDelta(defenderUnit.save + weapon.ap, modifiers, "SAVE_THRESHOLD_DELTA");
  const invuln = defenderUnit.invuln;
  const effectiveInvuln = invuln !== undefined
    ? applyAndClampDelta(invuln, modifiers, "INVULN_THRESHOLD_DELTA")
    : undefined;
  const saveThreshold = Math.max(
    2,
    effectiveInvuln !== undefined ? Math.min(armorSave, effectiveInvuln) : armorSave,
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

  for (let i = 0; i < unsavedNormal; i++) {
    const rawDmg = rng.dice(weapon.damage) + extraDamage;
    const dmg = Math.min(rawDmg, remainingHealth); // cap — no spillover
    remainingHealth -= dmg;
    totalDamage += dmg;
    if (remainingHealth <= 0) {
      modelsSlain++;
      remainingHealth = defenderUnit.wounds;
    }
  }

  for (let i = 0; i < mortalWounds; i++) {
    let dmg = rng.dice(weapon.damage) + extraDamage;
    totalDamage += dmg;
    while (dmg > 0) {
      const applied = Math.min(dmg, remainingHealth);
      remainingHealth -= applied;
      dmg -= applied;
      if (remainingHealth <= 0) {
        modelsSlain++;
        remainingHealth = defenderUnit.wounds;
      }
    }
  }

  return { attacks: totalAttacks, hits: totalHits, wounds: totalWounds, unsavedWounds: totalUnsaved, damage: totalDamage, modelsSlain };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/lib/calculator/simulation/pipeline.test.ts
```

Expected: all pipeline tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculator/simulation/pipeline.ts src/lib/calculator/simulation/pipeline.test.ts
git commit -m "feat: add simulateWeaponOnce simulation pipeline"
```

---

## Task 5: Create simulation/runner.ts

**Files:**
- Create: `src/lib/calculator/simulation/runner.ts`
- Create: `src/lib/calculator/simulation/runner.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/calculator/simulation/runner.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runSimulation } from "@/lib/calculator/simulation/runner";
import { Rng } from "@/lib/calculator/simulation/rng";
import { DEFAULT_ATTACKER_CONTEXT, DEFAULT_DEFENDER_CONTEXT, UnitProfile, WeaponProfile } from "@/lib/calculator/types";

// Deterministic RNG: always returns `value`
function alwaysRoll(value: number): Rng {
  return {
    d6: () => value,
    dice: (expr) => {
      if (typeof expr === "number") return expr;
      const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const modifier = match[3] ? parseInt(match[3], 10) : 0;
      return count * value + modifier;
    },
  };
}

const infantry: UnitProfile = {
  id: "infantry", name: "Infantry",
  toughness: 4, save: 4, wounds: 1, keywords: [],
  shootingWeapons: [], meleeWeapons: [],
};

const bolter: WeaponProfile = {
  name: "Bolter", attacks: 1, skill: 3, strength: 4, ap: 3, damage: 1, abilities: [],
};

describe("runSimulation", () => {
  it("returns a WeaponResult with the correct weapon name and model count", async () => {
    const result = await runSimulation(
      alwaysRoll(6), bolter, 2, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.weaponName).toBe("Bolter");
    expect(result.modelCount).toBe(2);
  });

  it("returns 6 steps with correct labels", async () => {
    const result = await runSimulation(
      alwaysRoll(6), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    const labels = result.steps.map((s) => s.label);
    expect(labels).toEqual(["Attacks", "Hits", "Wounds", "Unsaved Wounds", "Damage", "Models Slain"]);
  });

  it("with a deterministic RNG, all N runs are identical so averages equal a single run", async () => {
    // alwaysRoll(6): every roll is 6 → deterministic outcome
    // 1 model, 1 attack per model → 1 attack, hits (3+), wounds (4+), fails save (AP3 → save 7+ → always fail)
    // damage 1, slays 1 infantry
    const result = await runSimulation(
      alwaysRoll(6), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.steps[0].average).toBe(1);   // attacks
    expect(result.steps[1].average).toBe(1);   // hits
    expect(result.steps[2].average).toBe(1);   // wounds
    expect(result.steps[3].average).toBe(1);   // unsaved wounds
    expect(result.steps[4].average).toBe(1);   // damage
    expect(result.steps[5].average).toBe(1);   // models slain
    expect(result.averageDamage).toBe(1);
    expect(result.averageModelsSlain).toBe(1);
  });

  it("step[n].input equals step[n-1].average", async () => {
    const result = await runSimulation(
      alwaysRoll(6), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i].input).toBeCloseTo(result.steps[i - 1].average, 5);
    }
  });

  it("with alwaysRoll(1): no hits → all subsequent averages are 0", async () => {
    const result = await runSimulation(
      alwaysRoll(1), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.steps[1].average).toBe(0); // hits
    expect(result.steps[2].average).toBe(0); // wounds
    expect(result.averageDamage).toBe(0);
    expect(result.averageModelsSlain).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/lib/calculator/simulation/runner.test.ts
```

Expected: FAIL — `runSimulation` not found.

- [ ] **Step 3: Implement simulation/runner.ts**

Create `src/lib/calculator/simulation/runner.ts`:

```ts
import {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
  WeaponResult,
  CombatStep,
} from "../types";
import { Rng } from "./rng";
import { StepCounts, simulateWeaponOnce } from "./pipeline";

export const SIMULATION_RUNS = 10_000;

export async function runSimulation(
  rng: Rng,
  weapon: WeaponProfile,
  attackerModelCount: number,
  attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext = DEFAULT_DEFENDER_CONTEXT,
): Promise<WeaponResult> {
  const accumulated: StepCounts = {
    attacks: 0, hits: 0, wounds: 0,
    unsavedWounds: 0, damage: 0, modelsSlain: 0,
  };

  for (let i = 0; i < SIMULATION_RUNS; i++) {
    const counts = simulateWeaponOnce(
      rng, weapon, attackerModelCount, attackerContext,
      defenderUnit, defenderModelCount, defenderContext,
    );
    accumulated.attacks      += counts.attacks;
    accumulated.hits         += counts.hits;
    accumulated.wounds       += counts.wounds;
    accumulated.unsavedWounds += counts.unsavedWounds;
    accumulated.damage       += counts.damage;
    accumulated.modelsSlain  += counts.modelsSlain;
  }

  const avg = (n: number) => n / SIMULATION_RUNS;

  const avgAttacks      = avg(accumulated.attacks);
  const avgHits         = avg(accumulated.hits);
  const avgWounds       = avg(accumulated.wounds);
  const avgUnsaved      = avg(accumulated.unsavedWounds);
  const avgDamage       = avg(accumulated.damage);
  const avgModelsSlain  = avg(accumulated.modelsSlain);

  const steps: CombatStep[] = [
    { label: "Attacks",        input: attackerModelCount, average: avgAttacks      },
    { label: "Hits",           input: avgAttacks,         average: avgHits         },
    { label: "Wounds",         input: avgHits,            average: avgWounds       },
    { label: "Unsaved Wounds", input: avgWounds,          average: avgUnsaved      },
    { label: "Damage",         input: avgUnsaved,         average: avgDamage       },
    { label: "Models Slain",   input: avgDamage,          average: avgModelsSlain  },
  ];

  return {
    weaponName: weapon.name,
    modelCount: attackerModelCount,
    steps,
    averageDamage: avgDamage,
    averageModelsSlain: avgModelsSlain,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/lib/calculator/simulation/runner.test.ts
```

Expected: all runner tests PASS.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/calculator/simulation/runner.ts src/lib/calculator/simulation/runner.test.ts
git commit -m "feat: add runSimulation runner"
```

---

## Task 6: Update index.ts to use the simulation engine

**Files:**
- Modify: `src/lib/calculator/index.ts`

- [ ] **Step 1: Rewrite index.ts**

Replace the entire contents of `src/lib/calculator/index.ts`:

```ts
/**
 * Public API for the combat calculator.
 */

import {
  CombatInput,
  CombatResult,
  DirectionalResult,
  SelectedWeaponInput,
  UnitProfile,
  AttackerContext,
  DefenderContext,
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "./types";
import { standardRng } from "./simulation/rng";
import { runSimulation } from "./simulation/runner";

async function resolveDirection(
  attackerUnit: UnitProfile,
  attackerModelCount: number,
  attackerContext: AttackerContext,
  selectedWeapons: SelectedWeaponInput[],
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext,
): Promise<DirectionalResult> {
  const weaponResults = await Promise.all(
    selectedWeapons.map(({ weapon, modelCount }) =>
      runSimulation(
        standardRng,
        weapon,
        modelCount,
        attackerContext,
        defenderUnit,
        defenderModelCount,
        defenderContext,
      )
    )
  );

  const totalAverageDamage = weaponResults.reduce((sum, r) => sum + r.averageDamage, 0);
  const totalAverageModelsSlain = weaponResults.reduce((sum, r) => sum + r.averageModelsSlain, 0);

  return {
    attackerName: `${attackerUnit.name} (${attackerModelCount})`,
    defenderName: defenderUnit.name,
    weaponResults,
    totalAverageDamage,
    totalAverageModelsSlain,
  };
}

export async function calculate(input: CombatInput): Promise<CombatResult> {
  if (input.phase === "shooting") {
    const { attacker, defender } = input;

    const primary = await resolveDirection(
      attacker.unit,
      attacker.modelCount,
      attacker.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
      attacker.selectedWeapons,
      defender.unit,
      defender.modelCount,
      defender.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
    );

    return { phase: "shooting", primary };
  }

  const { attacker, defender, firstFighter } = input;

  const [primary, counterattack] = await Promise.all([
    resolveDirection(
      attacker.unit,
      attacker.modelCount,
      attacker.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
      attacker.selectedWeapons,
      defender.unit,
      defender.modelCount,
      defender.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
    ),
    resolveDirection(
      defender.unit,
      defender.modelCount,
      defender.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
      defender.selectedWeapons,
      attacker.unit,
      attacker.modelCount,
      attacker.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
    ),
  ]);

  const firstFighterNote =
    firstFighter === "defender"
      ? `${defender.unit.name} fights first. Their counterattack resolves before ${attacker.unit.name} attacks. Casualties from the counterattack are not yet reflected in the primary attack (full model counts used).`
      : `${attacker.unit.name} fights first. Casualties from the primary attack are not yet reflected in the counterattack counts.`;

  return { phase: "melee", primary, counterattack, firstFighterNote };
}

export * from "./types";
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/calculator/index.ts
git commit -m "feat: wire async calculate() to simulation engine"
```

---

## Task 7: Update page.tsx to use async calculate() and DefenderContext

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the calculate() call in page.tsx**

In `src/app/page.tsx`, the `calculate()` call is inside an event handler. Make the handler async (it likely already is, given the `try/catch`) and await the result. Replace the two occurrences of `inCover: form.defenderInCover` with `defenderContext: { inCover: form.defenderInCover }`.

The call site currently looks like:

```ts
const combatResult = calculate(
  form.phase === "shooting"
    ? {
        phase: "shooting",
        attacker: { ... },
        defender: {
          unit: defender,
          modelCount: form.defenderCount,
          inCover: form.defenderInCover,   // ← change
          selectedWeapons: defenderWeapons,
        },
      }
    : {
        phase: "melee",
        attacker: { ... },
        defender: {
          unit: defender,
          modelCount: form.defenderCount,
          inCover: form.defenderInCover,   // ← change
          attackerContext: form.defenderContext,
          selectedWeapons: defenderWeapons,
        },
        firstFighter: form.firstFighter,
      }
);
setResult(combatResult);
```

Change to:

```ts
const combatResult = await calculate(
  form.phase === "shooting"
    ? {
        phase: "shooting",
        attacker: { ... },
        defender: {
          unit: defender,
          modelCount: form.defenderCount,
          defenderContext: { inCover: form.defenderInCover },
          selectedWeapons: defenderWeapons,
        },
      }
    : {
        phase: "melee",
        attacker: { ... },
        defender: {
          unit: defender,
          modelCount: form.defenderCount,
          defenderContext: { inCover: form.defenderInCover },
          attackerContext: form.defenderContext,
          selectedWeapons: defenderWeapons,
        },
        firstFighter: form.firstFighter,
      }
);
setResult(combatResult);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: await calculate() and use DefenderContext in page.tsx"
```

---

## Task 8: Delete old analytical files

**Files:**
- Delete: `src/lib/calculator/dice.ts`
- Delete: `src/lib/calculator/rules.ts`
- Delete: `src/lib/calculator/pipeline.ts`

- [ ] **Step 1: Delete the files**

```bash
git rm src/lib/calculator/dice.ts src/lib/calculator/rules.ts src/lib/calculator/pipeline.ts
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors. If any file still imports from the deleted modules, fix the import.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove analytical pipeline (replaced by simulation)"
```

---

## Task 9: Smoke test in the browser

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Manually verify**

Open the app, configure a shooting combat (e.g. 5 Space Marines with Bolt Rifles vs 10 Orks), and submit. Confirm:
- The result renders without error
- Averages are plausible (not NaN, not 0 for all, not wildly off)
- The step breakdown (Attacks → Hits → … → Models Slain) is displayed

- [ ] **Step 3: Stop the dev server and commit if any fixes were needed**

If any issues were found and fixed in steps 1–2, commit the fixes:

```bash
git add -p
git commit -m "fix: <describe what was fixed>"
```
