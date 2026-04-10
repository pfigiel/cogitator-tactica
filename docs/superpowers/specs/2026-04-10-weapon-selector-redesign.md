# Weapon Selector Redesign

**Date:** 2026-04-10
**Status:** Approved

## Overview

Replace the checkbox-based `WeaponSelector` component with a two-section list UI: a "Selected" section and an "Available" section. Users move weapons between sections using `+` and `−` buttons. The component's props interface and parent state shape are unchanged, preserving LLM integration.

## Motivation

The checkbox approach conflates selection state with ordering controls and model count inputs into a single list, making the UI cluttered. The two-section design makes the selected/available distinction explicit and provides a cleaner interaction model.

## Component Interface

No changes to props. `WeaponSelector` continues to receive:

```ts
{
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  color: string;
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}
```

The parent (`CombatForm`) and LLM parser (`src/lib/llm/parser.ts`) are untouched — they already control the `selected` array externally, so programmatic state setting works without any changes.

## Layout

Vertical stack with two labeled sections:

### Selected Weapons

- Always visible, even when empty.
- Empty state: dimmed helper text "No weapons selected".
- Each row (when non-empty): `[weapon name + stats] [model count input] [▲] [▼] [−]`
  - `▲` / `▼` only shown when more than one weapon is selected; disabled at boundaries.
  - `−` button calls `onToggle(weaponName)` to move the weapon back to available.

### Available Weapons

- Always visible, even when empty.
- Empty state: dimmed helper text "No weapons available".
- Each row (when non-empty): `[weapon name + stats] [+]`
  - `+` button calls `onToggle(weaponName)` to move the weapon to selected.

## Ordering

Available weapons are displayed in their original `weapons` array order. Selected weapons are displayed in the order they appear in the `selected` array (controlled by the parent via `onMoveUp`/`onMoveDown`).

## Empty Selected List

Allowed. Unlike the previous design, there is no guard preventing the last selected weapon from being removed. The parent handles any downstream implications (e.g. the calculator receives an empty weapon list).

## Out of Scope

- Changes to `AttackerContextSection`
- Changes to parent handlers in `CombatForm`
- Changes to the LLM parser
- Any other part of the form
