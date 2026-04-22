# Weapon Count Extraction Design

**Date:** 2026-04-19  
**Status:** Approved

## Problem

The parser extracts `defenderWeaponNames: string[]` from the prompt but discards per-weapon model counts. A prompt like "19 boyz have choppas and 1 boy has big choppa" produces two weapons each defaulting to `defenderCount = 20`, yielding 20 choppas + 20 big choppas instead of 19 + 1.

## Goal

Populate `SelectedWeapon.modelCount` correctly from the prompt so the form shows accurate per-weapon model counts, falling back to total unit count only when the prompt doesn't specify.

## Data Model Changes

Add a `WeaponHint` type to `ParsedContext`:

```ts
type WeaponHint = { name: string; count?: number };
```

Replace in `ParsedContext`:

- `attackerWeaponNames: string[]` → `attackerWeaponHints: WeaponHint[]`
- `defenderWeaponNames: string[]` → `defenderWeaponHints: WeaponHint[]`

No changes to `SelectedWeapon`, `CombatFormState`, or the `/parse` API response shape.

## Call 1 — Context Extraction

Update the system prompt to extract `attackerWeaponHints` / `defenderWeaponHints` as `[{name, count}]` arrays.

**Critical instruction to LLM:** Only populate `count` when a number is directly and explicitly stated in the prompt for that specific weapon. Never infer, guess, or distribute the total model count across weapons.

Examples:

- "19 boyz have choppas and 1 boy has big choppa" → `[{name:"choppa",count:19},{name:"big_choppa",count:1}]`
- "10 intercessors with bolt rifles and bolt pistols" → `[{name:"bolt_rifle"}, {name:"bolt_pistol"}]` (no count)

Update `parseContextFromJson` to parse the new shape with defensive fallbacks (treat missing/invalid count as `undefined`).

## Call 2 — Weapon Resolution

Update the user message to include counts when present:

```
Attacker weapons mentioned: bolt_rifle
Defender weapons mentioned: choppa (19), big_choppa (1)
```

The call 2 LLM already outputs `modelCount` per weapon in its schema — with the count in the user message, it will pass it through. `parseWeaponList` already maps `item.modelCount` → `SelectedWeapon.modelCount`, so no changes needed there.

## Form Population

No changes. `WeaponSelector` already does `sw.entry.modelCount ?? defaultModelCount`. When `modelCount` is set, it displays that value; otherwise falls back to the total unit count.
