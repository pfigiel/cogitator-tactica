# Calculator Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the web app's combat calculator into a NestJS `CalculatorModule` in the backend, refactoring the simulation pipeline into a `SimulationService` with private phase methods and replacing the modifier switch with an ability handler map.

**Architecture:** `RngService` (injectable dice roller) is injected into `SimulationService`, which runs the Monte Carlo simulation in private phase methods (`resolveAttacks`, `resolveHits`, `resolveWounds`, `resolveSaves`, `resolveDamage`) orchestrated by a private `simulateWeaponOnce` and exposed via the public `runSimulation`. `CalculatorService` injects `SimulationService` and implements the `calculate()` orchestration (multi-weapon, bidirectional). `CalculatorController` accepts `POST /calculate` with class-validator DTOs.

**Tech Stack:** NestJS 11, class-validator, class-transformer, vitest, vitest-mock-extended

---

## File Map

| File                                                        | Action | Purpose                                         |
| ----------------------------------------------------------- | ------ | ----------------------------------------------- |
| `apps/backend/main.ts`                                      | Modify | Add `ValidationPipe`                            |
| `apps/backend/src/calculator/types.ts`                      | Create | Calculator-specific types                       |
| `apps/backend/src/calculator/rng.service.ts`                | Create | `Rng` interface + injectable `RngService`       |
| `apps/backend/src/calculator/rng.service.spec.ts`           | Create | Tests for `RngService`                          |
| `apps/backend/src/calculator/modifiers.ts`                  | Create | Ability handler map + aggregation helpers       |
| `apps/backend/src/calculator/simulation.service.ts`         | Create | Monte Carlo simulation logic                    |
| `apps/backend/src/calculator/simulation.service.spec.ts`    | Create | Tests for `SimulationService`                   |
| `apps/backend/src/calculator/test/mocks.ts`                 | Create | `getMockCombatInput()`, `getMockCombatResult()` |
| `apps/backend/src/calculator/calculator.service.ts`         | Create | `calculate()` orchestration                     |
| `apps/backend/src/calculator/calculator.service.spec.ts`    | Create | Tests for `CalculatorService`                   |
| `apps/backend/src/calculator/dtos.ts`                       | Create | class-validator DTOs for `CombatInput`          |
| `apps/backend/src/calculator/calculator.controller.ts`      | Create | `POST /calculate`                               |
| `apps/backend/src/calculator/calculator.controller.spec.ts` | Create | Tests for `CalculatorController`                |
| `apps/backend/src/calculator/calculator.module.ts`          | Create | NestJS module wiring                            |
| `apps/backend/src/app.module.ts`                            | Modify | Import `CalculatorModule`                       |

---

### Task 1: Install class-validator and add ValidationPipe

**Files:**

- Modify: `apps/backend/package.json`
- Modify: `apps/backend/main.ts`

- [ ] **Step 1: Install class-validator and class-transformer**

Run from the monorepo root:

```bash
pnpm add --save-exact --filter @cogitator-tactica/backend class-validator class-transformer
```

Expected: packages added to `apps/backend/package.json` with exact versions, no `^` or `~`.

- [ ] **Step 2: Add ValidationPipe to main.ts**

Replace `apps/backend/main.ts` with:

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./src/app.module";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3001);
};

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
cd apps/backend && pnpm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/package.json apps/backend/main.ts
git commit -m "feat: add class-validator and ValidationPipe"
```

---

### Task 2: Create calculator types

**Files:**

- Create: `apps/backend/src/calculator/types.ts`

These are calculator-specific types that do not belong in `src/common/types.ts`. Shared types (`WeaponProfile`, `UnitProfile`, `AttackerContext`, `DefenderContext`, etc.) remain in `src/common/types.ts`.

- [ ] **Step 1: Create types.ts**

Create `apps/backend/src/calculator/types.ts`:

```ts
export type RerollType = "ONES" | "ALL";

export type ModifierEffect =
  | { type: "HIT_THRESHOLD_DELTA"; value: number }
  | { type: "WOUND_THRESHOLD_DELTA"; value: number }
  | { type: "SAVE_THRESHOLD_DELTA"; value: number }
  | { type: "INVULN_THRESHOLD_DELTA"; value: number }
  | { type: "CRIT_HIT_THRESHOLD"; value: number }
  | { type: "CRIT_WOUND_THRESHOLD"; value: number }
  | { type: "HIT_REROLL"; reroll: RerollType }
  | { type: "WOUND_REROLL"; reroll: RerollType }
  | { type: "SAVE_REROLL"; reroll: RerollType }
  | { type: "EXTRA_ATTACKS"; value: number }
  | { type: "EXTRA_DAMAGE"; value: number }
  | { type: "AUTO_HIT" }
  | { type: "LETHAL_HITS" }
  | { type: "SUSTAINED_HITS"; value: number }
  | { type: "DEVASTATING_WOUNDS" }
  | { type: "IGNORE_COVER" };

export type Modifier = {
  source: string;
  effect: ModifierEffect;
};

export type StepCounts = {
  attacks: number;
  hits: number;
  wounds: number;
  unsavedWounds: number;
  damage: number;
  modelsSlain: number;
};

export type CombatStep = {
  label: string;
  input: number;
  average: number;
};

export type WeaponResult = {
  weaponName: string;
  modelCount: number;
  steps: CombatStep[];
  averageDamage: number;
  averageModelsSlain: number;
};

export type DirectionalResult = {
  attackerName: string;
  defenderName: string;
  weaponResults: WeaponResult[];
  totalAverageDamage: number;
  totalAverageModelsSlain: number;
};

export type CombatResult = {
  phase: "shooting" | "melee";
  primary: DirectionalResult;
  counterattack?: DirectionalResult;
  firstFighterNote?: string;
};

import type {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
} from "../common/types";

export type SelectedWeaponInput = {
  weapon: WeaponProfile;
  modelCount: number;
};

export type CombatantInput = {
  unit: UnitProfile;
  modelCount: number;
  defenderContext?: DefenderContext;
  attackerContext?: AttackerContext;
  selectedWeapons: SelectedWeaponInput[];
};

export type ShootingCombatInput = {
  phase: "shooting";
  attacker: CombatantInput;
  defender: CombatantInput;
};

export type MeleeCombatInput = {
  phase: "melee";
  attacker: CombatantInput;
  defender: CombatantInput;
  firstFighter: "attacker" | "defender";
};

export type CombatInput = ShootingCombatInput | MeleeCombatInput;
```

- [ ] **Step 2: Verify types compile**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/calculator/types.ts
git commit -m "feat: add calculator module types"
```

---

### Task 3: Create RngService

**Files:**

- Create: `apps/backend/src/calculator/rng.service.ts`
- Create: `apps/backend/src/calculator/rng.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/calculator/rng.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { RngService } from "./rng.service";

describe("RngService", () => {
  let service: RngService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RngService],
    }).compile();

    service = module.get<RngService>(RngService);
  });

  describe("d6", () => {
    it("should return integer between 1 and 6 inclusive when called", () => {
      for (let i = 0; i < 200; i++) {
        const result = service.d6();

        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });
  });

  describe("dice", () => {
    it("should return number unchanged when given a numeric expression", () => {
      expect(service.dice(0)).toBe(0);
      expect(service.dice(3)).toBe(3);
      expect(service.dice(10)).toBe(10);
    });

    it("should return integer in [1, 6] when given 'D6'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D6");

        expect(Number.isInteger(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(6);
      }
    });

    it("should return integer in [1, 3] when given 'D3'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D3");

        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(3);
      }
    });

    it("should return integer in [2, 12] when given '2D6'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("2D6");

        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(12);
      }
    });

    it("should return integer in [2, 7] when given 'D6+1'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D6+1");

        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(7);
      }
    });

    it("should return integer in [0, 2] when given 'D3-1'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D3-1");

        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(2);
      }
    });

    it("should throw when given an invalid dice expression", () => {
      expect(() => service.dice("D8")).toThrow('Invalid DiceExpression: "D8"');
      expect(() => service.dice("D10+1")).toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test -- src/calculator/rng.service.spec.ts
```

Expected: FAIL — `RngService` not found.

- [ ] **Step 3: Create RngService**

Create `apps/backend/src/calculator/rng.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import type { DiceExpression } from "../common/types";

export type Rng = {
  d6(): number;
  dice(expr: DiceExpression): number;
};

@Injectable()
export class RngService implements Rng {
  d6(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

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
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test -- src/calculator/rng.service.spec.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/calculator/rng.service.ts apps/backend/src/calculator/rng.service.spec.ts
git commit -m "feat: add RngService"
```

---

### Task 4: Create modifiers.ts

**Files:**

- Create: `apps/backend/src/calculator/modifiers.ts`

The switch statement from the web app is replaced with an ability handler map. Each ability type maps to a function that returns `Modifier[]`. This means adding a new ability requires adding only one entry to the map.

**Key conventions:**

- AP in `WeaponProfile` is stored as a positive integer — the pipeline computes `save + ap` to get the required roll (e.g., `ap: 3` on a 4+ save makes it a 7+ = impossible save).
- Cover applies `SAVE_THRESHOLD_DELTA: -1` to lower the required roll (easier save = better for defender).
- `INDIRECT_FIRE` grants cover bonus unless the weapon also has `IGNORES_COVER` — the handler inspects the full weapon to check this.

- [ ] **Step 1: Create modifiers.ts**

Create `apps/backend/src/calculator/modifiers.ts`:

```ts
import type {
  WeaponProfile,
  UnitProfile,
  WeaponAbility,
  AttackerContext,
  DefenderContext,
} from "../common/types";
import { DEFAULT_ATTACKER_CONTEXT } from "../common/types";
import type { Modifier, ModifierEffect, RerollType } from "./types";

type AbilityHandler = (
  ability: WeaponAbility,
  weapon: WeaponProfile,
  attackerContext: AttackerContext,
  defenderUnit: UnitProfile,
  defenderContext: DefenderContext,
  defenderModelCount: number,
) => Modifier[];

const abilityHandlers: Partial<Record<string, AbilityHandler>> = {
  ANTI: (ability, _, __, defenderUnit) => {
    const a = ability as Extract<WeaponAbility, { type: "ANTI" }>;
    const defKeywords = defenderUnit.keywords.map((k) => k.toUpperCase());
    if (!defKeywords.includes(a.keyword.toUpperCase())) return [];
    return [
      {
        source: `Anti-${a.keyword} ${a.threshold}+`,
        effect: { type: "CRIT_WOUND_THRESHOLD", value: a.threshold },
      },
    ];
  },

  BLAST: (_, __, ___, ____, _____, defenderModelCount) => [
    {
      source: "Blast",
      effect: {
        type: "EXTRA_ATTACKS",
        value: Math.floor(defenderModelCount / 5),
      },
    },
  ],

  CONVERSION: (_, __, attackerContext) => {
    if (!attackerContext.atLongRange) return [];
    return [
      {
        source: "Conversion",
        effect: { type: "CRIT_HIT_THRESHOLD", value: 4 },
      },
    ];
  },

  DEVASTATING_WOUNDS: () => [
    { source: "Devastating Wounds", effect: { type: "DEVASTATING_WOUNDS" } },
  ],

  HEAVY: (_, __, attackerContext) => {
    if (!attackerContext.remainedStationary) return [];
    return [
      { source: "Heavy", effect: { type: "HIT_THRESHOLD_DELTA", value: -1 } },
    ];
  },

  IGNORES_COVER: () => [
    { source: "Ignores Cover", effect: { type: "IGNORE_COVER" } },
  ],

  INDIRECT_FIRE: (_, weapon) => {
    const hasIgnoresCover = weapon.abilities.some(
      (a) => a.type === "IGNORES_COVER",
    );
    const mods: Modifier[] = [
      {
        source: "Indirect Fire",
        effect: { type: "HIT_THRESHOLD_DELTA", value: 1 },
      },
    ];
    if (!hasIgnoresCover) {
      mods.push({
        source: "Indirect Fire (cover)",
        effect: { type: "SAVE_THRESHOLD_DELTA", value: -1 },
      });
    }
    return mods;
  },

  LANCE: (_, __, attackerContext) => {
    if (!attackerContext.charged) return [];
    return [
      { source: "Lance", effect: { type: "WOUND_THRESHOLD_DELTA", value: -1 } },
    ];
  },

  LETHAL_HITS: () => [
    { source: "Lethal Hits", effect: { type: "LETHAL_HITS" } },
  ],

  MELTA: (ability, __, attackerContext) => {
    if (!attackerContext.atHalfRange) return [];
    const a = ability as Extract<WeaponAbility, { type: "MELTA" }>;
    return [
      {
        source: `Melta (${a.value})`,
        effect: { type: "EXTRA_DAMAGE", value: a.value },
      },
    ];
  },

  RAPID_FIRE: (ability, __, attackerContext) => {
    if (!attackerContext.atHalfRange) return [];
    const a = ability as Extract<WeaponAbility, { type: "RAPID_FIRE" }>;
    if (typeof a.value !== "number") return [];
    return [
      {
        source: `Rapid Fire (${a.value})`,
        effect: { type: "EXTRA_ATTACKS", value: a.value },
      },
    ];
  },

  SUSTAINED_HITS: (ability) => {
    const a = ability as Extract<WeaponAbility, { type: "SUSTAINED_HITS" }>;
    if (typeof a.value !== "number") return [];
    return [
      {
        source: `Sustained Hits (${a.value})`,
        effect: { type: "SUSTAINED_HITS", value: a.value },
      },
    ];
  },

  TORRENT: () => [{ source: "Torrent", effect: { type: "AUTO_HIT" } }],

  TWIN_LINKED: () => [
    { source: "Twin-linked", effect: { type: "WOUND_REROLL", reroll: "ALL" } },
  ],
};

export const resolveWeaponModifiers = (
  weapon: WeaponProfile,
  context: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderContext: DefenderContext,
  defenderModelCount: number,
): Modifier[] => {
  const modifiers: Modifier[] = [];

  const hasIgnoresCover = weapon.abilities.some(
    (a) => a.type === "IGNORES_COVER",
  );
  if (defenderContext.inCover && !hasIgnoresCover) {
    modifiers.push({
      source: "cover",
      effect: { type: "SAVE_THRESHOLD_DELTA", value: -1 },
    });
  }

  for (const ability of weapon.abilities) {
    const handler = abilityHandlers[ability.type];
    if (handler) {
      modifiers.push(
        ...handler(
          ability,
          weapon,
          context,
          defenderUnit,
          defenderContext,
          defenderModelCount,
        ),
      );
    }
  }

  return modifiers;
};

export const hasModifier = (
  modifiers: Modifier[],
  type: ModifierEffect["type"],
): boolean => modifiers.some((m) => m.effect.type === type);

export const applyAndClampDelta = (
  base: number,
  modifiers: Modifier[],
  type:
    | "HIT_THRESHOLD_DELTA"
    | "WOUND_THRESHOLD_DELTA"
    | "SAVE_THRESHOLD_DELTA"
    | "INVULN_THRESHOLD_DELTA",
): number => {
  const rawTotal = modifiers
    .filter((m) => m.effect.type === type)
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );
  return base + Math.max(-1, Math.min(1, rawTotal));
};

export const effectiveCritThreshold = (
  modifiers: Modifier[],
  type: "CRIT_HIT_THRESHOLD" | "CRIT_WOUND_THRESHOLD",
  defaultValue = 6,
): number => {
  const values = modifiers
    .filter((m) => m.effect.type === type)
    .map((m) => (m.effect as { type: string; value: number }).value);
  return values.length > 0 ? Math.min(...values) : defaultValue;
};

export const effectiveReroll = (
  modifiers: Modifier[],
  type: "HIT_REROLL" | "WOUND_REROLL" | "SAVE_REROLL",
): RerollType | null => {
  const rerolls = modifiers
    .filter((m) => m.effect.type === type)
    .map((m) => (m.effect as { type: string; reroll: RerollType }).reroll);
  if (rerolls.includes("ALL")) return "ALL";
  if (rerolls.includes("ONES")) return "ONES";
  return null;
};

export const totalExtraAttacks = (modifiers: Modifier[]): number =>
  modifiers
    .filter((m) => m.effect.type === "EXTRA_ATTACKS")
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );

export const totalExtraDamage = (modifiers: Modifier[]): number =>
  modifiers
    .filter((m) => m.effect.type === "EXTRA_DAMAGE")
    .reduce(
      (sum, m) => sum + (m.effect as { type: string; value: number }).value,
      0,
    );

export const effectiveSustainedHits = (modifiers: Modifier[]): number => {
  const values = modifiers
    .filter((m) => m.effect.type === "SUSTAINED_HITS")
    .map((m) => (m.effect as { type: string; value: number }).value);
  return values.length > 0 ? Math.max(...values) : 0;
};
```

- [ ] **Step 2: Verify types compile**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/calculator/modifiers.ts
git commit -m "feat: add modifiers with ability handler map"
```

---

### Task 5: Create SimulationService

**Files:**

- Create: `apps/backend/src/calculator/simulation.service.ts`
- Create: `apps/backend/src/calculator/simulation.service.spec.ts`

**Architecture note on phase methods:**

- `resolveWounds` returns `{ saveableWounds, mortalWounds }` where `saveableWounds` = auto-wounds (from Lethal Hits) + normal wounds (both go to save rolls), and `mortalWounds` = devastating wounds (bypass saves).
- `resolveSaves` returns `unsavedNormal` (wounds that failed saves). Mortal wounds are not passed here — they flow directly from `resolveWounds` to `resolveDamage`.
- `resolveDamage` takes both `unsavedNormal` and `mortalWounds` because they have different damage spillover rules: normal wounds do NOT spill across model boundaries; mortal wounds DO spill.
- `simulateWeaponOnce` computes `unsavedWounds = unsavedNormal + mortalWounds` for the `StepCounts` return.

**Save direction:** Save FAILS when `d6() < saveThreshold`. So `saveThreshold = 4` means rolls 1–3 fail, rolls 4–6 pass (4+ save). Positive `weapon.ap` increases the threshold (e.g., `ap: 3` on a 4+ save → threshold 7 → always fails on a d6).

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/calculator/simulation.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { SimulationService } from "./simulation.service";
import { RngService } from "./rng.service";
import { getMockProvider } from "../common/test/utils";
import {
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
  UnitProfile,
  WeaponProfile,
} from "../common/types";
import type { DiceExpression } from "../common/types";

const infantry: UnitProfile = {
  id: "infantry",
  name: "Infantry",
  toughness: 4,
  save: 4,
  wounds: 1,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
};

const tankProfile: UnitProfile = {
  id: "tank",
  name: "Tank",
  toughness: 8,
  save: 2,
  wounds: 10,
  keywords: ["VEHICLE"],
  shootingWeapons: [],
  meleeWeapons: [],
};

const basicWeapon: WeaponProfile = {
  id: "bolter",
  name: "Bolter",
  attacks: 1,
  skill: 3,
  strength: 4,
  ap: 0,
  damage: 1,
  abilities: [],
};

describe("SimulationService", () => {
  let service: SimulationService;
  let rng: MockProxy<RngService>;

  beforeEach(async () => {
    const rngProvider = getMockProvider(RngService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [SimulationService, rngProvider],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    rng = module.get<MockProxy<RngService>>(RngService);
  });

  const mockRoll = (value: number) => {
    rng.d6.mockReturnValue(value);
    rng.dice.mockImplementation((expr: DiceExpression) => {
      if (typeof expr === "number") return expr;
      const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const mod = match[3] ? parseInt(match[3], 10) : 0;
      return count * value + mod;
    });
  };

  describe("runSimulation", () => {
    it("should return WeaponResult with correct name and modelCount when called", async () => {
      mockRoll(1);

      const result = await service.runSimulation(
        basicWeapon,
        2,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.weaponName).toBe("Bolter");
      expect(result.modelCount).toBe(2);
    });

    it("should return 6 steps with correct labels when called", async () => {
      mockRoll(1);

      const result = await service.runSimulation(
        basicWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps).toHaveLength(6);
      expect(result.steps.map((s) => s.label)).toEqual([
        "Attacks",
        "Hits",
        "Wounds",
        "Unsaved Wounds",
        "Damage",
        "Models Slain",
      ]);
    });

    it("should set step[n].input equal to step[n-1].average for all steps when called", async () => {
      mockRoll(6);

      const result = await service.runSimulation(
        { ...basicWeapon, ap: 3 },
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        100,
      );

      for (let i = 1; i < result.steps.length; i++) {
        expect(result.steps[i].input).toBeCloseTo(
          result.steps[i - 1].average,
          5,
        );
      }
    });

    it("should return all-zero averages when roll is below hit threshold", async () => {
      mockRoll(1);

      const result = await service.runSimulation(
        basicWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(0);
      expect(result.steps[2].average).toBe(0);
      expect(result.averageDamage).toBe(0);
      expect(result.averageModelsSlain).toBe(0);
    });

    it("should return 1 model slain when all rolls are 6 and save is impossible", async () => {
      mockRoll(6);
      // ap: 3 → saveThreshold = max(2, 4+3) = 7 → roll 6 < 7 → fails save always
      const result = await service.runSimulation(
        { ...basicWeapon, ap: 3 },
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[0].average).toBe(1); // attacks
      expect(result.steps[1].average).toBe(1); // hits
      expect(result.steps[2].average).toBe(1); // wounds
      expect(result.steps[3].average).toBe(1); // unsaved
      expect(result.averageDamage).toBe(1);
      expect(result.averageModelsSlain).toBe(1);
    });

    it("should auto-hit all attacks when weapon has TORRENT regardless of roll", async () => {
      mockRoll(1); // roll 1 would miss normally
      const torrent: WeaponProfile = {
        ...basicWeapon,
        attacks: 3,
        ap: 3,
        abilities: [{ type: "TORRENT" }],
      };

      const result = await service.runSimulation(
        torrent,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      // TORRENT auto-hits. Roll 1 wounds? S4 vs T4 → wound on 4+; roll 1 < 4 → no wound.
      expect(result.steps[0].average).toBe(3); // attacks
      expect(result.steps[1].average).toBe(3); // auto-hits
      expect(result.steps[2].average).toBe(0); // wound roll fails (1 < 4)
    });

    it("should bypass wound roll for crit hits when weapon has LETHAL_HITS", async () => {
      mockRoll(6);
      // S1 vs T4 would normally wound on 6+, but Lethal Hits skips the wound roll
      const lethalWeapon: WeaponProfile = {
        ...basicWeapon,
        attacks: 2,
        strength: 1,
        ap: 3,
        abilities: [{ type: "LETHAL_HITS" }],
      };

      const result = await service.runSimulation(
        lethalWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(2); // hits (2 crit hits)
      expect(result.steps[2].average).toBe(2); // wounds (auto-wounds from Lethal Hits, bypass wound roll)
      expect(result.steps[3].average).toBe(2); // unsaved (ap:3 → impossible save)
    });

    it("should bypass saves for crit wounds when weapon has DEVASTATING_WOUNDS", async () => {
      mockRoll(6);
      const devastatingWeapon: WeaponProfile = {
        ...basicWeapon,
        attacks: 2,
        abilities: [{ type: "DEVASTATING_WOUNDS" }],
      };

      const result = await service.runSimulation(
        devastatingWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(2); // hits
      expect(result.steps[2].average).toBe(2); // wounds (all crit → mortal wounds)
      // all crit wounds bypass saves → all unsaved
      expect(result.steps[3].average).toBe(2);
    });

    it("should cap damage at remaining model wounds without spillover for normal wounds", async () => {
      mockRoll(6);
      // infantry has 1 wound, weapon does 3 damage
      const heavyWeapon: WeaponProfile = { ...basicWeapon, ap: 3, damage: 3 };

      const result = await service.runSimulation(
        heavyWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[3].average).toBe(1); // unsaved wounds
      expect(result.averageDamage).toBe(1); // capped at 1 (model has 1 wound), not 3
      expect(result.averageModelsSlain).toBe(1);
    });

    it("should spill damage across model boundaries for mortal wounds", async () => {
      mockRoll(6);
      // 10-wound tank, 2 attacks of 5 damage
      const multiDmg: WeaponProfile = {
        ...basicWeapon,
        attacks: 2,
        ap: 5,
        damage: 5,
        strength: 10,
        abilities: [{ type: "DEVASTATING_WOUNDS" }],
      };

      const result = await service.runSimulation(
        multiDmg,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        tankProfile,
        1,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      // mortal wounds spill → 5+5=10 damage → 1 model slain (tank has 10 wounds)
      expect(result.averageDamage).toBe(10);
      expect(result.averageModelsSlain).toBe(1);
    });

    it("should grant +1 to save when defender is in cover", async () => {
      // roll 3: hits (3 >= skill 3), wounds (S8 vs T4 → 3+, roll 3 >=3), fails save without cover (4+, roll 3 < 4)
      rng.d6.mockReturnValue(3);
      rng.dice.mockImplementation((expr: DiceExpression) =>
        typeof expr === "number" ? expr : 3,
      );
      const highStrWeapon: WeaponProfile = {
        ...basicWeapon,
        strength: 8,
        ap: 0,
      };

      const noCover = await service.runSimulation(
        highStrWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      const withCover = await service.runSimulation(
        highStrWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        { inCover: true },
        1,
      );

      expect(noCover.steps[1].average).toBe(1); // hits
      expect(noCover.steps[3].average).toBe(1); // unsaved (roll 3 < save threshold 4)
      expect(withCover.steps[1].average).toBe(1); // hits
      expect(withCover.steps[3].average).toBe(0); // saved by cover (threshold becomes 3, roll 3 >= 3)
    });

    it("should apply ANTI crit wound threshold when defender has matching keyword", async () => {
      mockRoll(6);
      const antiWeapon: WeaponProfile = {
        ...basicWeapon,
        attacks: 2,
        strength: 4,
        ap: 3,
        abilities: [
          { type: "ANTI", keyword: "VEHICLE", threshold: 4 },
          { type: "DEVASTATING_WOUNDS" },
        ],
      };
      const vehicle: UnitProfile = {
        id: "vehicle",
        name: "Vehicle",
        toughness: 8,
        save: 2,
        wounds: 1,
        keywords: ["VEHICLE"],
        shootingWeapons: [],
        meleeWeapons: [],
      };

      const result = await service.runSimulation(
        antiWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        vehicle,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(2); // hits
      expect(result.steps[2].average).toBe(2); // wounds (via Anti 4+ crit threshold)
      expect(result.steps[3].average).toBe(2); // unsaved (Devastating Wounds bypass 2+ save)
    });

    it("should resolve DiceExpression strength to determine wound threshold", async () => {
      mockRoll(6);
      // strength: "D6", alwaysRoll(6) → dice("D6") = 6. S6 vs T4 → wound on 3+
      const diceStrengthWeapon: WeaponProfile = {
        ...basicWeapon,
        strength: "D6",
        ap: 10,
      };

      const result = await service.runSimulation(
        diceStrengthWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantry,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(1); // hits
      expect(result.steps[2].average).toBe(1); // wounds (S6 vs T4 → wound on 3+, roll 6 ≥ 3)
      expect(result.steps[3].average).toBe(1); // unsaved (ap:10 → impossible save)
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test -- src/calculator/simulation.service.spec.ts
```

Expected: FAIL — `SimulationService` not found.

- [ ] **Step 3: Create SimulationService**

Create `apps/backend/src/calculator/simulation.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import type {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
} from "../common/types";
import {
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "../common/types";
import {
  resolveWeaponModifiers,
  hasModifier,
  applyAndClampDelta,
  effectiveCritThreshold,
  effectiveReroll,
  totalExtraAttacks,
  totalExtraDamage,
  effectiveSustainedHits,
} from "./modifiers";
import { RngService } from "./rng.service";
import type {
  Modifier,
  StepCounts,
  WeaponResult,
  CombatStep,
  RerollType,
} from "./types";

const DEFAULT_ITERATIONS = 10_000;

const woundThreshold = (strength: number, toughness: number): number => {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 > toughness) return 5;
  return 6;
};

@Injectable()
export class SimulationService {
  constructor(private readonly rng: RngService) {}

  async runSimulation(
    weapon: WeaponProfile,
    attackerModelCount: number,
    attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
    defenderUnit: UnitProfile,
    defenderModelCount: number,
    defenderContext: DefenderContext = DEFAULT_DEFENDER_CONTEXT,
    iterations: number = DEFAULT_ITERATIONS,
  ): Promise<WeaponResult> {
    const accumulated: StepCounts = {
      attacks: 0,
      hits: 0,
      wounds: 0,
      unsavedWounds: 0,
      damage: 0,
      modelsSlain: 0,
    };

    for (let i = 0; i < iterations; i++) {
      const counts = this.simulateWeaponOnce(
        weapon,
        attackerModelCount,
        attackerContext,
        defenderUnit,
        defenderModelCount,
        defenderContext,
      );
      accumulated.attacks += counts.attacks;
      accumulated.hits += counts.hits;
      accumulated.wounds += counts.wounds;
      accumulated.unsavedWounds += counts.unsavedWounds;
      accumulated.damage += counts.damage;
      accumulated.modelsSlain += counts.modelsSlain;
    }

    const avg = (n: number) => n / iterations;
    const avgAttacks = avg(accumulated.attacks);
    const avgHits = avg(accumulated.hits);
    const avgWounds = avg(accumulated.wounds);
    const avgUnsaved = avg(accumulated.unsavedWounds);
    const avgDamage = avg(accumulated.damage);
    const avgModelsSlain = avg(accumulated.modelsSlain);

    const steps: CombatStep[] = [
      { label: "Attacks", input: attackerModelCount, average: avgAttacks },
      { label: "Hits", input: avgAttacks, average: avgHits },
      { label: "Wounds", input: avgHits, average: avgWounds },
      { label: "Unsaved Wounds", input: avgWounds, average: avgUnsaved },
      { label: "Damage", input: avgUnsaved, average: avgDamage },
      { label: "Models Slain", input: avgDamage, average: avgModelsSlain },
    ];

    return {
      weaponName: weapon.name,
      modelCount: attackerModelCount,
      steps,
      averageDamage: avgDamage,
      averageModelsSlain: avgModelsSlain,
    };
  }

  private simulateWeaponOnce(
    weapon: WeaponProfile,
    attackerModelCount: number,
    attackerContext: AttackerContext,
    defenderUnit: UnitProfile,
    defenderModelCount: number,
    defenderContext: DefenderContext,
  ): StepCounts {
    const modifiers = resolveWeaponModifiers(
      weapon,
      attackerContext,
      defenderUnit,
      defenderContext,
      defenderModelCount,
    );

    const totalAttacks = this.resolveAttacks(
      weapon,
      attackerModelCount,
      modifiers,
    );
    const { normalHits, critHits } = this.resolveHits(
      totalAttacks,
      weapon,
      modifiers,
    );
    const { saveableWounds, mortalWounds } = this.resolveWounds(
      normalHits,
      critHits,
      weapon,
      defenderUnit,
      modifiers,
    );
    const unsavedNormal = this.resolveSaves(
      saveableWounds,
      weapon.ap,
      defenderUnit,
      defenderContext,
      modifiers,
    );
    const { damage, modelsSlain } = this.resolveDamage(
      unsavedNormal,
      mortalWounds,
      weapon,
      defenderUnit,
      defenderModelCount,
      modifiers,
    );

    return {
      attacks: totalAttacks,
      hits: normalHits + critHits,
      wounds: saveableWounds + mortalWounds,
      unsavedWounds: unsavedNormal + mortalWounds,
      damage,
      modelsSlain,
    };
  }

  private resolveAttacks(
    weapon: WeaponProfile,
    attackerModelCount: number,
    modifiers: Modifier[],
  ): number {
    const extraAttacks = totalExtraAttacks(modifiers);
    let total = extraAttacks;
    for (let i = 0; i < attackerModelCount; i++) {
      total += this.rng.dice(weapon.attacks);
    }
    return total;
  }

  private resolveHits(
    totalAttacks: number,
    weapon: WeaponProfile,
    modifiers: Modifier[],
  ): { normalHits: number; critHits: number } {
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

    let normalHits = 0;
    let critHits = 0;

    if (isAutoHit) {
      normalHits = totalAttacks;
    } else {
      for (let i = 0; i < totalAttacks; i++) {
        const roll = this.rollWithReroll(hitReroll, hitThreshold);
        if (roll >= hitThreshold) {
          if (roll >= critHitThreshold) {
            critHits++;
            normalHits += sustainedHitsValue;
          } else {
            normalHits++;
          }
        }
      }
    }

    return { normalHits, critHits };
  }

  private resolveWounds(
    normalHits: number,
    critHits: number,
    weapon: WeaponProfile,
    defenderUnit: UnitProfile,
    modifiers: Modifier[],
  ): { saveableWounds: number; mortalWounds: number } {
    const hasLethalHits = hasModifier(modifiers, "LETHAL_HITS");
    const baseWoundThresh = woundThreshold(
      this.rng.dice(weapon.strength),
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

    // Lethal Hits: crit hits skip the wound roll and become auto-wounds (still require saves)
    const autoWounds = hasLethalHits ? critHits : 0;
    const hitsToWoundRoll = normalHits + (hasLethalHits ? 0 : critHits);

    let normalWounds = 0;
    let mortalWounds = 0;

    for (let i = 0; i < hitsToWoundRoll; i++) {
      const roll = this.rollWithReroll(woundReroll, effectiveWoundThresh);
      if (roll >= effectiveWoundThresh) {
        if (roll >= critWoundThreshold && hasDevastatingWounds) {
          mortalWounds++;
        } else {
          normalWounds++;
        }
      }
    }

    return {
      saveableWounds: autoWounds + normalWounds,
      mortalWounds,
    };
  }

  private resolveSaves(
    saveableWounds: number,
    weaponAp: number,
    defenderUnit: UnitProfile,
    defenderContext: DefenderContext,
    modifiers: Modifier[],
  ): number {
    const armorSave = applyAndClampDelta(
      defenderUnit.save + weaponAp,
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

    let unsavedNormal = 0;
    for (let i = 0; i < saveableWounds; i++) {
      if (this.rng.d6() < saveThreshold) {
        unsavedNormal++;
      }
    }

    return unsavedNormal;
  }

  private resolveDamage(
    unsavedNormal: number,
    mortalWounds: number,
    weapon: WeaponProfile,
    defenderUnit: UnitProfile,
    defenderModelCount: number,
    modifiers: Modifier[],
  ): { damage: number; modelsSlain: number } {
    const extraDamage = totalExtraDamage(modifiers);
    let totalDamage = 0;
    let modelsSlain = 0;
    let remainingHealth = defenderUnit.wounds;

    // Normal wounds: damage capped at remaining model health, no spillover
    for (
      let i = 0;
      i < unsavedNormal && modelsSlain < defenderModelCount;
      i++
    ) {
      const rawDmg = this.rng.dice(weapon.damage) + extraDamage;
      const dmg = Math.min(rawDmg, remainingHealth);
      remainingHealth -= dmg;
      totalDamage += dmg;
      if (remainingHealth <= 0) {
        modelsSlain++;
        remainingHealth = defenderUnit.wounds;
      }
    }

    // Mortal wounds: damage spills across model boundaries
    for (let i = 0; i < mortalWounds && modelsSlain < defenderModelCount; i++) {
      let dmg = this.rng.dice(weapon.damage) + extraDamage;
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

    return { damage: totalDamage, modelsSlain };
  }

  private rollWithReroll(reroll: RerollType | null, threshold: number): number {
    const roll = this.rng.d6();
    if (reroll === "ALL" && roll < threshold) return this.rng.d6();
    if (reroll === "ONES" && roll === 1) return this.rng.d6();
    return roll;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test -- src/calculator/simulation.service.spec.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/calculator/simulation.service.ts apps/backend/src/calculator/simulation.service.spec.ts
git commit -m "feat: add SimulationService with phase-decomposed pipeline"
```

---

### Task 6: Create test mocks

**Files:**

- Create: `apps/backend/src/calculator/test/mocks.ts`

- [ ] **Step 1: Create test/mocks.ts**

Create `apps/backend/src/calculator/test/mocks.ts`:

```ts
import type { CombatInput, CombatResult, DirectionalResult } from "../types";
import {
  getMockUnitProfile,
  getMockWeaponProfile,
} from "../../common/test/mocks";

export const getMockDirectionalResult = (
  overrides: Partial<DirectionalResult> = {},
): DirectionalResult => ({
  attackerName: "Attacker (5)",
  defenderName: "Defender",
  weaponResults: [],
  totalAverageDamage: 3.5,
  totalAverageModelsSlain: 1.2,
  ...overrides,
});

export const getMockCombatResult = (
  overrides: Partial<CombatResult> = {},
): CombatResult => ({
  phase: "shooting",
  primary: getMockDirectionalResult(),
  ...overrides,
});

export const getMockCombatInput = (
  overrides: Partial<CombatInput> = {},
): CombatInput =>
  ({
    phase: "shooting",
    attacker: {
      unit: getMockUnitProfile(),
      modelCount: 5,
      selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 5 }],
    },
    defender: {
      unit: getMockUnitProfile(),
      modelCount: 10,
      selectedWeapons: [],
    },
    ...overrides,
  }) as CombatInput;
```

- [ ] **Step 2: Verify types compile**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/calculator/test/mocks.ts
git commit -m "feat: add calculator test mocks"
```

---

### Task 7: Create CalculatorService

**Files:**

- Create: `apps/backend/src/calculator/calculator.service.ts`
- Create: `apps/backend/src/calculator/calculator.service.spec.ts`

`CalculatorService` contains the orchestration logic from the web app's `index.ts`: resolving directions (per-weapon simulation), combining weapon results, and handling shooting vs. melee phases.

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/calculator/calculator.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { CalculatorService } from "./calculator.service";
import { SimulationService } from "./simulation.service";
import { getMockProvider } from "../common/test/utils";
import { getMockCombatInput, getMockCombatResult } from "./test/mocks";
import { getMockUnitProfile, getMockWeaponProfile } from "../common/test/mocks";

describe("CalculatorService", () => {
  let service: CalculatorService;
  let simulationService: MockProxy<SimulationService>;

  beforeEach(async () => {
    const simulationProvider = getMockProvider(SimulationService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculatorService, simulationProvider],
    }).compile();

    service = module.get<CalculatorService>(CalculatorService);
    simulationService =
      module.get<MockProxy<SimulationService>>(SimulationService);
  });

  describe("calculate", () => {
    it("should return shooting CombatResult with primary direction when phase is shooting", async () => {
      const weaponResult = {
        weaponName: "Bolter",
        modelCount: 5,
        steps: [],
        averageDamage: 2,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);

      const input = getMockCombatInput({ phase: "shooting" });

      const result = await service.calculate(input);

      expect(result.phase).toBe("shooting");
      expect(result.primary).toBeDefined();
      expect(result.counterattack).toBeUndefined();
    });

    it("should call runSimulation once per selected weapon when phase is shooting", async () => {
      const weaponResult = {
        weaponName: "Bolter",
        modelCount: 5,
        steps: [],
        averageDamage: 2,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);

      const weapon1 = getMockWeaponProfile({ id: "w1" });
      const weapon2 = getMockWeaponProfile({ id: "w2" });
      const input = getMockCombatInput({
        phase: "shooting",
        attacker: {
          unit: getMockUnitProfile(),
          modelCount: 5,
          selectedWeapons: [
            { weapon: weapon1, modelCount: 5 },
            { weapon: weapon2, modelCount: 3 },
          ],
        },
      } as any);

      await service.calculate(input);

      expect(simulationService.runSimulation).toHaveBeenCalledTimes(2);
    });

    it("should return melee CombatResult with primary and counterattack when phase is melee", async () => {
      const weaponResult = {
        weaponName: "Sword",
        modelCount: 5,
        steps: [],
        averageDamage: 3,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);

      const attacker = getMockUnitProfile({ name: "Attacker" });
      const defender = getMockUnitProfile({ name: "Defender" });
      const input = getMockCombatInput({
        phase: "melee",
        attacker: {
          unit: attacker,
          modelCount: 5,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 5 }],
        },
        defender: {
          unit: defender,
          modelCount: 10,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 10 }],
        },
        firstFighter: "attacker",
      } as any);

      const result = await service.calculate(input);

      expect(result.phase).toBe("melee");
      expect(result.primary).toBeDefined();
      expect(result.counterattack).toBeDefined();
      expect(result.firstFighterNote).toContain("Attacker");
    });

    it("should include defender name in firstFighterNote when firstFighter is defender", async () => {
      const weaponResult = {
        weaponName: "Sword",
        modelCount: 5,
        steps: [],
        averageDamage: 3,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);

      const attacker = getMockUnitProfile({ name: "Marines" });
      const defender = getMockUnitProfile({ name: "Orks" });
      const input = getMockCombatInput({
        phase: "melee",
        attacker: {
          unit: attacker,
          modelCount: 5,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 5 }],
        },
        defender: {
          unit: defender,
          modelCount: 10,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 10 }],
        },
        firstFighter: "defender",
      } as any);

      const result = await service.calculate(input);

      expect(result.firstFighterNote).toContain("Orks");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test -- src/calculator/calculator.service.spec.ts
```

Expected: FAIL — `CalculatorService` not found.

- [ ] **Step 3: Create CalculatorService**

Create `apps/backend/src/calculator/calculator.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import type {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
} from "../common/types";
import {
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "../common/types";
import { SimulationService } from "./simulation.service";
import type {
  CombatInput,
  CombatResult,
  DirectionalResult,
  SelectedWeaponInput,
} from "./types";

@Injectable()
export class CalculatorService {
  constructor(private readonly simulation: SimulationService) {}

  async calculate(input: CombatInput): Promise<CombatResult> {
    if (input.phase === "shooting") {
      const { attacker, defender } = input;

      const primary = await this.resolveDirection(
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
      this.resolveDirection(
        attacker.unit,
        attacker.modelCount,
        attacker.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
        attacker.selectedWeapons,
        defender.unit,
        defender.modelCount,
        defender.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
      ),
      this.resolveDirection(
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

  private async resolveDirection(
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
        this.simulation.runSimulation(
          weapon,
          modelCount,
          attackerContext,
          defenderUnit,
          defenderModelCount,
          defenderContext,
        ),
      ),
    );

    const totalAverageDamage = weaponResults.reduce(
      (sum, r) => sum + r.averageDamage,
      0,
    );
    const totalAverageModelsSlain = weaponResults.reduce(
      (sum, r) => sum + r.averageModelsSlain,
      0,
    );

    return {
      attackerName: `${attackerUnit.name} (${attackerModelCount})`,
      defenderName: defenderUnit.name,
      weaponResults,
      totalAverageDamage,
      totalAverageModelsSlain,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test -- src/calculator/calculator.service.spec.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/calculator/calculator.service.ts apps/backend/src/calculator/calculator.service.spec.ts
git commit -m "feat: add CalculatorService"
```

---

### Task 8: Create DTOs

**Files:**

- Create: `apps/backend/src/calculator/dtos.ts`

DTOs mirror `CombatInput` structure with class-validator decorators. `DiceExpression` fields (`attacks`, `strength`, `damage`) accept `number | string` — annotated with a custom union check. `WeaponAbility[]` is validated as an array of objects; the discriminated union structure is enforced by TypeScript types, not runtime validators.

- [ ] **Step 1: Create dtos.ts**

Create `apps/backend/src/calculator/dtos.ts`:

```ts
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class AttackerContextDto {
  @IsBoolean()
  remainedStationary: boolean;

  @IsBoolean()
  charged: boolean;

  @IsBoolean()
  atHalfRange: boolean;

  @IsBoolean()
  atLongRange: boolean;
}

class DefenderContextDto {
  @IsBoolean()
  inCover: boolean;
}

class WeaponProfileDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  attacks: number | string;

  @IsInt()
  skill: number;

  strength: number | string;

  @IsInt()
  ap: number;

  damage: number | string;

  @IsArray()
  abilities: object[];
}

class UnitProfileDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  toughness: number;

  @IsInt()
  @Min(2)
  save: number;

  @IsOptional()
  @IsInt()
  invuln?: number;

  @IsInt()
  @Min(1)
  wounds: number;

  @IsArray()
  keywords: string[];

  @IsArray()
  shootingWeapons: object[];

  @IsArray()
  meleeWeapons: object[];
}

class SelectedWeaponInputDto {
  @ValidateNested()
  @Type(() => WeaponProfileDto)
  weapon: WeaponProfileDto;

  @IsInt()
  @Min(1)
  modelCount: number;
}

class CombatantInputDto {
  @ValidateNested()
  @Type(() => UnitProfileDto)
  unit: UnitProfileDto;

  @IsInt()
  @Min(1)
  modelCount: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttackerContextDto)
  attackerContext?: AttackerContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DefenderContextDto)
  defenderContext?: DefenderContextDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedWeaponInputDto)
  selectedWeapons: SelectedWeaponInputDto[];
}

export class CalculateDto {
  @IsIn(["shooting", "melee"])
  phase: "shooting" | "melee";

  @ValidateNested()
  @Type(() => CombatantInputDto)
  attacker: CombatantInputDto;

  @ValidateNested()
  @Type(() => CombatantInputDto)
  defender: CombatantInputDto;

  @IsOptional()
  @IsIn(["attacker", "defender"])
  firstFighter?: "attacker" | "defender";
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/calculator/dtos.ts
git commit -m "feat: add CalculateDto with class-validator"
```

---

### Task 9: Create CalculatorController, CalculatorModule, and wire AppModule

**Files:**

- Create: `apps/backend/src/calculator/calculator.controller.ts`
- Create: `apps/backend/src/calculator/calculator.controller.spec.ts`
- Create: `apps/backend/src/calculator/calculator.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Write the failing controller tests**

Create `apps/backend/src/calculator/calculator.controller.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { CalculatorController } from "./calculator.controller";
import { CalculatorService } from "./calculator.service";
import { getMockProvider } from "../common/test/utils";
import { getMockCombatInput, getMockCombatResult } from "./test/mocks";

describe("CalculatorController", () => {
  let controller: CalculatorController;
  let calculatorService: MockProxy<CalculatorService>;

  beforeEach(async () => {
    const calculatorProvider = getMockProvider(CalculatorService);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalculatorController],
      providers: [calculatorProvider],
    }).compile();

    controller = module.get<CalculatorController>(CalculatorController);
    calculatorService =
      module.get<MockProxy<CalculatorService>>(CalculatorService);
  });

  describe("calculate", () => {
    it("should return CombatResult when valid input is provided", async () => {
      const input = getMockCombatInput();
      const expected = getMockCombatResult();
      calculatorService.calculate.mockResolvedValue(expected);

      const result = await controller.calculate(input as any);

      expect(result).toEqual(expected);
      expect(calculatorService.calculate).toHaveBeenCalledWith(input);
    });

    it("should delegate to CalculatorService when called", async () => {
      const input = getMockCombatInput();
      calculatorService.calculate.mockResolvedValue(getMockCombatResult());

      await controller.calculate(input as any);

      expect(calculatorService.calculate).toHaveBeenCalledTimes(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test -- src/calculator/calculator.controller.spec.ts
```

Expected: FAIL — `CalculatorController` not found.

- [ ] **Step 3: Create CalculatorController**

Create `apps/backend/src/calculator/calculator.controller.ts`:

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { CalculatorService } from "./calculator.service";
import { CalculateDto } from "./dtos";
import type { CombatResult } from "./types";

@Controller("calculate")
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Post()
  calculate(@Body() body: CalculateDto): Promise<CombatResult> {
    return this.calculatorService.calculate(body as any);
  }
}
```

- [ ] **Step 4: Create CalculatorModule**

Create `apps/backend/src/calculator/calculator.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { CalculatorController } from "./calculator.controller";
import { CalculatorService } from "./calculator.service";
import { SimulationService } from "./simulation.service";
import { RngService } from "./rng.service";

@Module({
  controllers: [CalculatorController],
  providers: [CalculatorService, SimulationService, RngService],
  exports: [CalculatorService],
})
export class CalculatorModule {}
```

- [ ] **Step 5: Register CalculatorModule in AppModule**

Modify `apps/backend/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { UnitsModule } from "./units/units.module";
import { ParsePromptModule } from "./parse-prompt/parse-prompt.module";
import { CalculatorModule } from "./calculator/calculator.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    UnitsModule,
    ParsePromptModule,
    CalculatorModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Run controller tests to verify they pass**

```bash
cd apps/backend && pnpm test -- src/calculator/calculator.controller.spec.ts
```

Expected: all tests pass.

- [ ] **Step 7: Run the full test suite**

```bash
cd apps/backend && pnpm test
```

Expected: all tests pass.

- [ ] **Step 8: Verify types**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/calculator/ apps/backend/src/app.module.ts
git commit -m "feat: add CalculatorController, CalculatorModule, wire AppModule"
```
