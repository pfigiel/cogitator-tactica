# Unit Vector Search — Design Spec

**Date:** 2026-04-14
**Status:** Approved

## Problem

The LLM parser passes the full unit list to the LLM on every prompt parse. As more units are added this grows the context, increases latency, and raises costs.

## Solution

Replace the unit-list-in-prompt approach with a two-phase pipeline:

1. LLM extracts structured context from the user prompt (no unit list provided).
2. Vector search resolves attacker/defender names to exact DB records.

Weapon resolution also improves: instead of passing the raw user prompt to the weapon LLM, the extracted weapon name strings from phase 1 are passed instead.

## Data Flow

```
User prompt
    │
    ▼
extractContext(prompt)
    LLM call — no unit list in prompt
    Returns ParsedContext:
      attackerName: string
      defenderName: string
      attackerCount: number
      defenderCount: number
      phase: "shooting" | "melee"
      defenderInCover: boolean
      firstFighter: "attacker" | "defender"
      attackerWeaponNames: string[]
      defenderWeaponNames: string[]
    │
    ▼
resolveUnits(ctx)
    Embed attackerName and defenderName separately via Voyage AI
    Cosine-nearest search in DB per name → top-1 unit ID
    Fetch full UnitProfile via getUnit()
    Returns { attackerUnit, defenderUnit }
    │
    ▼
resolveWeapons(ctx, attackerUnit, defenderUnit)
    LLM call — receives unit weapon list + ctx.attackerWeaponNames / ctx.defenderWeaponNames
    Skipped if both weapon name arrays are empty (called if either is non-empty)
    │
    ▼
CombatFormState
```

## Components

### 1. `src/lib/voyage.ts` (new)

Thin wrapper around the `voyageai` npm package.

- `embedText(text: string): Promise<number[]>` — single embedding, used at query time in the parser
- `embedTexts(texts: string[]): Promise<number[][]>` — batch embedding, used by the generate-embeddings script
- Model: `voyage-3` (1024 dimensions)
- Auth: `VOYAGE_API_KEY` env var

### 2. Schema migration

Change `Unit.embedding` from `vector(1536)` to `vector(1024)` to match Voyage AI output dimensions. Implemented as a Prisma migration using raw SQL (drop + re-add column). Existing embeddings are lost but none are populated yet.

### 3. `scripts/generate-embeddings/index.ts` (new)

Standalone script to populate embeddings for all units.

- Fetches all units with weapons from DB
- Builds embedding text per unit: `{name} {keywords.join(' ')} {allWeaponNames.join(' ')}`
- Calls `embedTexts()` in batches
- Writes vectors back via `prisma.$executeRaw` with pgvector syntax
- Optional `--factions` flag to target specific factions (mirrors import script convention)

Run after `import-wahapedia` whenever units change.

### 4. `src/lib/db/units.ts` — new function

```ts
searchUnitsByEmbedding(embedding: number[], limit?: number): Promise<{ id: string; name: string }[]>
```

Uses `prisma.$queryRaw` with pgvector's `<=>` cosine distance operator. Default limit of 1 (top result always used).

### 5. `src/lib/llm/parser.ts` — refactor

**New type:**

```ts
type ParsedContext = {
  attackerName: string;
  defenderName: string;
  attackerCount: number;
  defenderCount: number;
  phase: "shooting" | "melee";
  defenderInCover: boolean;
  firstFighter: "attacker" | "defender";
  attackerWeaponNames: string[];
  defenderWeaponNames: string[];
};
```

**Function changes:**

| Old                              | New                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `resolveUnitsAndContext(prompt)` | `extractContext(prompt): Promise<ParsedContext>`                                                              |
| _(implicit)_                     | `resolveUnits(ctx): Promise<{ attackerUnit, defenderUnit }>`                                                  |
| `resolveWeapons(prompt, ...)`    | `resolveWeapons(ctx, ...)` — uses `ctx.attackerWeaponNames` / `ctx.defenderWeaponNames` instead of raw prompt |

`parsePrompt` calls these three in sequence.

`weaponsExplicit` field is removed — non-empty weapon name arrays serve as the signal to call `resolveWeapons`.

`ParsedContext` is internal to the LLM layer and not exported as a shared calculator type.

## Affected Files

| File                                   | Change                                     |
| -------------------------------------- | ------------------------------------------ |
| `prisma/schema.prisma`                 | `vector(1536)` → `vector(1024)`            |
| `prisma/migrations/...`                | New migration: resize embedding column     |
| `src/lib/voyage.ts`                    | New — Voyage AI client                     |
| `src/lib/llm/parser.ts`                | Refactor: new types + three-phase pipeline |
| `src/lib/db/units.ts`                  | Add `searchUnitsByEmbedding`               |
| `scripts/generate-embeddings/index.ts` | New script                                 |
| `.env` / `.env.example`                | Add `VOYAGE_API_KEY`                       |

## Out of Scope

- Weapon embeddings / vector-based weapon resolution (weapon lists per unit remain short enough for LLM)
- Confidence thresholds or multi-candidate disambiguation (top-1 result always used)
- Re-embedding on unit data changes (operator runs script manually after import)
