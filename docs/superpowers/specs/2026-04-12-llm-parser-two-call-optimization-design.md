# LLM Parser Two-Call Optimization Design

**Date:** 2026-04-12
**Status:** Approved

## Problem

`parsePrompt` in `src/lib/llm/parser.ts` sends a single LLM call with a system prompt that includes all 387 units and their full weapon stats. This generates approximately 25,000–30,000 tokens per request.

## Goal

Reduce token usage (API cost) by splitting the single call into at most two targeted calls, with no changes to the public interface or return type.

## Approach

Conditional two-call split:

1. **Call 1 (always):** Resolve unit identities and combat context from a compact unit name/id list.
2. **Call 2 (conditional):** Resolve specific weapons — only fires when the user's prompt explicitly names weapons.

When no weapons are mentioned (the common case), a single LLM call suffices and defaults are used for weapon selection.

## Token Savings

| Case | Current | Optimized | Reduction |
|------|---------|-----------|-----------|
| No weapons mentioned | ~25,000 | ~3,000 | ~88% |
| Weapons mentioned | ~25,000 | ~3,500 | ~86% |

## Code Structure

`parsePrompt` remains the public interface with unchanged return type (`CombatFormState`). Internally it orchestrates two private functions:

```ts
resolveUnitsAndContext(prompt: string): Promise<UnitResolution>
resolveWeapons(prompt: string, attackerUnit: UnitProfile, defenderUnit: UnitProfile, phase: Phase): Promise<WeaponResolution>
```

`parsePrompt` merges their results:

```
result = await resolveUnitsAndContext(prompt)
if result.weaponsExplicit:
  weapons = await resolveWeapons(prompt, UNITS[result.attackerUnitId], UNITS[result.defenderUnitId], result.phase)
else:
  weapons = defaults (first weapon from appropriate pool)
return merge(result, weapons)
```

## Call 1: Unit and Context Resolution

**System prompt context:** All 387 unit id/name pairs only — no weapons, no stats.

```
Available units:
  - id: "warboss", name: "Warboss"
  - id: "boyz_boy", name: "Boy"
  ... (387 entries)
```

**Response schema:**
```json
{
  "phase": "shooting" | "melee",
  "attackerUnitId": string,
  "attackerCount": number,
  "defenderUnitId": string,
  "defenderCount": number,
  "defenderInCover": boolean,
  "firstFighter": "attacker" | "defender",
  "weaponsExplicit": boolean
}
```

**`weaponsExplicit`:** `true` only if the user's prompt names specific weapon(s). If missing from response, treated as `false`.

**Rules (same as current):**
- `phase` defaults to `"shooting"` if unspecified
- `firstFighter` defaults to `"attacker"` if unspecified or ambiguous
- `defenderInCover` is `true` only if cover is explicitly mentioned
- `attackerCount` and `defenderCount` must be positive integers

## Call 2: Weapon Resolution

Only fires when `weaponsExplicit === true`.

**System prompt context:** Only the resolved attacker unit's weapons + (if melee phase) the defender's melee weapons, with full stats.

```
Attacker weapons:
  - "Power klaw" (A3 S8 AP-2 D2)
  ...
Defender melee weapons:   ← omitted in shooting phase
  - "Chainsword" (A2 S4 AP-1 D1)
  ...
```

**Response schema:**
```json
{
  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }],
  "defenderWeapons": [{ "weaponName": string, "modelCount": number | null }]
}
```

`defenderWeapons` is always present in the response schema, but in shooting phase it is populated from defaults (not from this LLM call).

**Rules (same as current):**
- Use weapon names exactly as listed
- `modelCount` is `null` if all models use the weapon, or a specific number if only some do

## Default Weapon Fallback

When call 2 is skipped:
- **Attacker:** first weapon from `shootingWeapons` (shooting phase) or `meleeWeapons` (melee phase)
- **Defender:** first weapon from `meleeWeapons` (always)

Same fallback behavior as current code.

## Error Handling

- **Call 1 fails** (invalid JSON, missing required fields): throw immediately
- **Call 2 fails** (invalid JSON or unrecognized weapon names): throw — user explicitly named weapons, silently defaulting would be wrong
- **`weaponsExplicit` missing** from call 1: treat as `false` (fail cheap, use defaults)
- **Unit ID not found in `UNITS`**: existing fallback applies (empty weapon pool → empty weapon list)

No retry logic. Both calls use `claude-haiku-4-5-20251001`.

## Testing

No tests in this implementation. Future coverage should include:
- `weaponsExplicit` correctly set for prompts with and without weapon names (mocked LLM)
- Full `parsePrompt` integration for both 1-call and 2-call paths (mocked LLM)
