# Calculator Module Design

**Date:** 2026-05-26  
**Task:** TASK-16

## Goal

Move the combat calculator from `apps/web/src/lib/calculator/` into a NestJS module in the backend. The simulation logic is pure TypeScript — wrap it in injectable services and expose via a controller.

## File Structure

```
apps/backend/src/calculator/
  calculator.module.ts          registers CalculatorService, SimulationService, controller
  calculator.controller.ts      POST /calculate
  calculator.service.ts         calculate() logic, injects SimulationService
  simulation.service.ts         runSimulation(), simulateWeaponOnce(), private phase methods
  modifiers.ts                  ability handler map → Modifier[]
  dtos.ts                       class-validator DTOs for CombatInput
  types.ts                      calculator-specific types
  rng.ts                        Rng interface + standardRng
  test/
    mocks.ts                    getMockCalculatorService(), getMockSimulationService()
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

## SimulationService (`simulation.service.ts`)

Injectable NestJS service. Encapsulates all Monte Carlo simulation logic.

**Public methods:**

- `runSimulation(rng, weapon, attackerModelCount, attackerContext, defenderUnit, defenderModelCount, defenderContext): Promise<WeaponResult>` — runs 10,000 iterations, returns averaged `StepCounts` as labeled `CombatStep[]`
- `simulateWeaponOnce(rng, weapon, attackerModelCount, attackerContext, defenderUnit, defenderModelCount, defenderContext): StepCounts` — single Monte Carlo trial

**Private phase methods** (called by `simulateWeaponOnce`):

- `resolveAttacks(rng, weapon, attackerModelCount, modifiers): number`
- `resolveHits(rng, totalAttacks, weapon, modifiers): { normalHits, critHits }`
- `resolveWounds(rng, normalHits, critHits, weapon, defenderUnit, modifiers): { saveableWounds, mortalWounds }` — `saveableWounds` includes normal wounds + lethal-hit auto-wounds (both go to saves); `mortalWounds` are devastating wounds that bypass saves
- `resolveSaves(rng, saveableWounds, mortalWounds, defenderUnit, defenderContext, modifiers): number` — returns total unsaved wounds (failed saves + mortal wounds)
- `resolveDamage(rng, unsavedWounds, weapon, defenderUnit, modifiers): { damage, modelsSlain }`

`simulateWeaponOnce` is orchestration only — calls phases in sequence, passing outputs as inputs to next phase. `Rng` is passed as parameter (not injected) so tests can use controlled `alwaysRoll(n)`.

## CalculatorService (`calculator.service.ts`)

Injectable NestJS service. Injects `SimulationService`. Contains the `calculate()` orchestration logic (previously in `index.ts`): resolves weapon results per direction, combines into `CombatResult`. Passes `standardRng` from `rng.ts` to `SimulationService`.

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

| File                            | Tests                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `simulation.service.spec.ts`    | Replaces `pipeline.test.ts` + `runner.test.ts`. Tests phase behavior via `simulateWeaponOnce` with `alwaysRoll(n)`. Tests `runSimulation` averages and step chain. |
| `rng.test.ts`                   | Migrated verbatim (pure function, no service dependency).                                                                                                          |
| `calculator.service.spec.ts`    | Tests `calculate()` delegation; mocks `SimulationService`.                                                                                                         |
| `calculator.controller.spec.ts` | Tests HTTP contract + validation; mocks `CalculatorService` via `getMockCalculatorService()`.                                                                      |

All test files follow project conventions: `"should ... when ..."` naming, AAA with blank lines between sections, mock creators in `test/mocks.ts`.

## Module Registration

```ts
@Module({
  controllers: [CalculatorController],
  providers: [CalculatorService, SimulationService],
  exports: [CalculatorService],
})
export class CalculatorModule {}
```

`CalculatorModule` imported in `AppModule`.
