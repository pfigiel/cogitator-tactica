---
id: TASK-16
title: Create calculator module
status: To Do
assignee: []
created_date: "2026-05-24"
updated_date: "2026-05-24"
labels: []
milestone: m-0
dependencies: [TASK-15]
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Move the combat calculator from `apps/web/src/lib/calculator/` into a NestJS module in the backend. The simulation logic is pure TypeScript with no framework dependencies — wrap it in a `CalculatorService` and expose it via a `CalculatorController`.

**Source files to migrate (preserving logic as-is):**

- `simulation/rng.ts` — `Rng` interface + `standardRng` implementation
- `simulation/pipeline.ts` — `simulateWeaponOnce` (single Monte Carlo trial)
- `simulation/runner.ts` — `runSimulation` (runs 10,000 trials, returns averages)
- `modifiers.ts` — `resolveWeaponModifiers` and all modifier helpers
- `index.ts` — `calculate` (public API: `CombatInput → CombatResult`)

Simulation code must remain readable and well-tested. All three existing test files (`pipeline.test.ts`, `rng.test.ts`, `runner.test.ts`) must be migrated alongside their source files.

**Calculator-specific types** (`CombatInput`, `CombatResult`, `DirectionalResult`, `SelectedWeaponInput`, `CombatantInput`, `ShootingCombatInput`, `MeleeCombatInput`) live in `src/calculator/types.ts` within this module. Shared types come from `src/common/types.ts` (TASK-15).

**NestJS wiring:**

- `CalculatorService` — wraps `calculate()`, injectable
- `CalculatorController` — `POST /calculate`, accepts `CombatInput`, returns `CombatResult`
- `CalculatorModule` — provides and exports `CalculatorService`, declares controller

<!-- SECTION:DESCRIPTION:END -->
