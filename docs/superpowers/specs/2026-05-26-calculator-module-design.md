# Calculator Module Design

**Date:** 2026-05-26  
**Task:** TASK-16

## Goal

Move the combat calculator from `apps/web/src/lib/calculator/` into a NestJS module in the backend. The simulation logic is pure TypeScript — wrap it in injectable services and expose via a controller.

## File Structure

```
apps/backend/src/calculator/
  calculator.module.ts          registers CalculatorService, SimulationService, RngService, controller
  calculator.controller.ts      POST /calculate
  calculator.service.ts         calculate() logic, injects SimulationService
  simulation.service.ts         runSimulation(), private simulateWeaponOnce(), private phase methods
  rng.service.ts                RngService — injectable Rng implementation
  modifiers.ts                  ability handler map → Modifier[]
  dtos.ts                       class-validator DTOs for CombatInput
  types.ts                      calculator-specific types
  test/
    mocks.ts                    getMockCalculatorService(), getMockSimulationService(), getMockRngService()
```

## Types (`types.ts`)

Calculator-specific types that do not belong in `src/common/types.ts`:

- `CombatInput` (`ShootingCombatInput | MeleeCombatInput`)
- `ShootingCombatInput`, `MeleeCombatInput`, `CombatantInput`, `SelectedWeaponInput`
- `CombatResult`, `DirectionalResult`, `WeaponResult`, `CombatStep`
- `Modifier`, `ModifierEffect`, `RerollType`
- `StepCounts` (internal pipeline accumulator)

Shared types (`WeaponProfile`, `UnitProfile`, `AttackerContext`, `DefenderContext`, `DiceExpression`, etc.) remain in `src/common/types.ts`.

## Modifiers (`modifiers.ts`)

Replace the large switch statement with an ability handler map for readability and extensibility:

```ts
type AbilityHandler = (
  ability: WeaponAbility,
  context: AttackerContext,
  defenderUnit: UnitProfile,
  defenderContext: DefenderContext,
) => Modifier[];

const abilityHandlers: Partial<Record<string, AbilityHandler>> = {
  ANTI: (ability, _, defenderUnit) => [...],
  HEAVY: (_, context) => [...],
  MELTA: (ability, context) => [...],
  // one entry per ability
};
```

`resolveWeaponModifiers` iterates abilities, looks up the handler, spreads results. Cover modifier applied separately before iteration (same as current logic). Adding a new ability = one new map entry, no switch fallthrough risk.

## RngService (`rng.service.ts`)

Injectable NestJS service implementing the `Rng` interface (`d6(): number`, `dice(expr: DiceExpression): number`). Wraps `Math.random`. Injected into `SimulationService`. Tests mock it via `getMockRngService()`.

## SimulationService (`simulation.service.ts`)

Injectable NestJS service. Injects `RngService`. Encapsulates all Monte Carlo simulation logic.

**Public methods:**

- `runSimulation(weapon, attackerModelCount, attackerContext, defenderUnit, defenderModelCount, defenderContext, iterations?: number): Promise<WeaponResult>` — runs `iterations` trials (default 10,000), returns averaged `StepCounts` as labeled `CombatStep[]`. Optional `iterations` allows tests to run fewer trials without mocking the full count.

**Private methods:**

- `simulateWeaponOnce(weapon, attackerModelCount, attackerContext, defenderUnit, defenderModelCount, defenderContext): StepCounts` — single Monte Carlo trial; orchestrates phase methods in sequence
- `resolveAttacks(weapon, attackerModelCount, modifiers): number`
- `resolveHits(totalAttacks, weapon, modifiers): { normalHits, critHits }`
- `resolveWounds(normalHits, critHits, weapon, defenderUnit, modifiers): { saveableWounds, mortalWounds }` — `saveableWounds` includes normal wounds + lethal-hit auto-wounds (both go to saves); `mortalWounds` are devastating wounds that bypass saves
- `resolveSaves(saveableWounds, mortalWounds, defenderUnit, defenderContext, modifiers): number` — returns total unsaved wounds (failed saves + mortal wounds)
- `resolveDamage(unsavedWounds, weapon, defenderUnit, modifiers): { damage, modelsSlain }`

`RngService` is injected, so tests mock it to control dice outcomes.

## CalculatorService (`calculator.service.ts`)

Injectable NestJS service. Injects `SimulationService`. Contains the `calculate()` orchestration logic (previously in `index.ts`): resolves weapon results per direction, combines into `CombatResult`.

## CalculatorController (`calculator.controller.ts`)

```
POST /calculate
Body: CombatInput (validated via class-validator DTOs in dtos.ts)
Returns: CombatResult
```

Validates body with class-validator DTOs. Delegates entirely to `CalculatorService`. Follows same pattern as `ParsePromptController`.

## DTOs (`dtos.ts`)

Class-validator DTOs mirroring `CombatInput` shape. Nested DTOs for `CombatantInput`, `SelectedWeaponInput`, `WeaponProfileDto`, `UnitProfileDto`, etc. Annotated with `@IsString()`, `@IsNumber()`, `@IsEnum()`, `@ValidateNested()`, `@Type()` as appropriate.

## Testing

| File                            | Tests                                                                                                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simulation.service.spec.ts`    | Replaces `pipeline.test.ts` + `runner.test.ts`. Mocks `RngService` to return controlled values. Tests behavior via `runSimulation` with small `iterations` count. Verifies step chain invariant: `step[n].input === step[n-1].average`. |
| `rng.service.spec.ts`           | Replaces `rng.test.ts`. Tests `d6()` range and `dice()` expression parsing.                                                                                                                                                             |
| `calculator.service.spec.ts`    | Tests `calculate()` delegation; mocks `SimulationService`.                                                                                                                                                                              |
| `calculator.controller.spec.ts` | Tests HTTP contract + validation; mocks `CalculatorService` via `getMockCalculatorService()`.                                                                                                                                           |

All test files follow project conventions: `"should ... when ..."` naming, AAA with blank lines between sections, mock creators in `test/mocks.ts`.

## Module Registration

```ts
@Module({
  controllers: [CalculatorController],
  providers: [CalculatorService, SimulationService, RngService],
  exports: [CalculatorService],
})
export class CalculatorModule {}
```

`CalculatorModule` imported in `AppModule`.
