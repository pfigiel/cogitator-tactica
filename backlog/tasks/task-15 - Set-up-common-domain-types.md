---
id: TASK-15
title: Set up common domain types
status: To Do
assignee: []
created_date: "2026-05-24"
updated_date: "2026-05-24"
labels: []
milestone: m-0
dependencies: []
ordinal: 2500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Extract shared domain types into `apps/backend/src/common/` so that feature modules (calculator, parser, units) can import from a single source of truth without creating circular dependencies.

**What to extract from `apps/web/src/lib/calculator/types.ts`:**

The types that are shared across more than one feature module:

- `DiceExpression`
- `WeaponAbility`
- `WeaponProfile`
- `UnitProfile`
- `AttackerContext` + `DEFAULT_ATTACKER_CONTEXT`
- `DefenderContext` + `DEFAULT_DEFENDER_CONTEXT`
- `CombatFormState`
- `SelectedWeapon`
- `Phase`
- `FirstFighter`

Calculator-specific types (`CombatInput`, `CombatResult`, `DirectionalResult`, `SelectedWeaponInput`, `CombatantInput`, `ShootingCombatInput`, `MeleeCombatInput`) stay in the calculator module.

**Files to create:**

- `src/common/types.ts` — all shared types listed above

No NestJS module or decorators needed — this is plain TypeScript.

<!-- SECTION:DESCRIPTION:END -->
