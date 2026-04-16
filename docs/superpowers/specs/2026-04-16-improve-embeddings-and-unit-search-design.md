# Improve Embeddings and Unit Search

**Date:** 2026-04-16
**Status:** Approved

## Problem

Current embedding strategy produces poor unit search accuracy:

- DB embeddings: `[name, ...keywords, ...weaponNames].join(" ")` — unstructured, includes noisy keywords
- Query embeddings: plain attacker/defender name strings extracted by LLM
- No structural alignment between DB and query embeddings
- No faction-based filtering to narrow search space

## Scope

This spec covers two improvements:

1. Structured, aligned embeddings for DB and query
2. Faction extraction + hard DB filter when faction explicitly mentioned

Unstructured (natural language) embeddings per unit are out of scope for now.

## Data Model

### New `factions` table

```prisma
model Faction {
  id    String @id   // e.g. "SM", "ORK"
  name  String       // full display name: "Space Marines", "Orks"
  units Unit[]
}
```

The existing `Faction` enum is dropped and replaced by this table. `units.faction_id` becomes a string FK referencing `factions.id`. The migration preserves existing data — no unit rows change, only the column type and constraint. Seeded with all existing factions.

### `ParsedContext` extension

```ts
attackerFactionId?: string   // faction id ("SM") or null if not explicitly mentioned
defenderFactionId?: string   // faction id ("ORK") or null if not explicitly mentioned
```

## Embedding Construction

### Shared utility

A single `buildUnitEmbeddingText` function used for both DB import and query construction, located at `src/lib/embeddings/units/buildUnitEmbeddingText.ts`:

```ts
buildUnitEmbeddingText(params: {
  name: string;
  faction?: string;        // full faction name e.g. "Space Marines"
  meleeWeapons?: string[];
  rangedWeapons?: string[];
}): string
```

Omits any section whose value is absent. This guarantees structural alignment between DB and query embeddings.

### DB embedding (all fields always present)

```
Unit: Intercessor Squad
Faction: Space Marines
Melee weapons: Astartes chainsword, Close combat weapon
Ranged weapons: Bolt rifle, Grenade Launcher
```

Keywords are excluded entirely — they add noise and are not referenced in user prompts.

### Query embedding (partial, built from LLM extraction)

For each side (attacker and defender):

```
Unit: <extracted name>
Faction: <full faction name>     ← only if explicitly mentioned in prompt
Ranged|Melee weapons: <names>    ← only if weapons mentioned; label determined by phase
```

Phase determines the weapon label for both sides. Weapons are included for a given side only if the user mentioned them for that side.

## LLM Changes (First Call — Context Extraction)

- All factions are fetched from DB and passed as context: `[{ id, name }, ...]`
- System prompt is extended to ask LLM to identify attacker/defender faction **only if explicitly stated** in the prompt (by name or recognizable alias). If uncertain, return `null`. No guessing.
- `ParsedContext` extended with `attackerFactionId` and `defenderFactionId`

## Vector Search Changes

`searchUnitsByEmbedding` gains an optional `factionId` parameter. When provided, appends `AND faction_id = $factionId` before the `ORDER BY` clause. When absent, searches all units.

## File Structure

| Concern                              | Location                                                               |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `buildUnitEmbeddingText`             | `src/lib/embeddings/units/buildUnitEmbeddingText.ts` (new)             |
| Voyage AI client / `embedText`       | `src/lib/embeddings/common/voyage.ts` (moved from `src/lib/voyage.ts`) |
| Factions DB query (`getAllFactions`) | `src/lib/db/factions.ts` (new)                                         |
| `searchUnitsByEmbedding`             | `src/lib/db/units.ts` (updated)                                        |
| Prisma schema + migration            | `prisma/schema.prisma` + new migration                                 |
| Factions seeding                     | `scripts/import-wahapedia/db.ts` (extended)                            |
| Parser                               | `src/lib/llm/parser.ts` (updated)                                      |
| Generate-embeddings script           | `scripts/generate-embeddings/index.ts` (updated)                       |

## Migration & Re-embedding

1. Add Prisma migration for the `factions` table (drop `Faction` enum, add `factions` table, update `units.faction_id` to string FK)
2. Extend `scripts/import-wahapedia/db.ts` to upsert faction rows (id + name) as part of the regular import flow — factions are sourced from Wahapedia data, not a one-off seed script
3. Re-run `generate-embeddings` script to regenerate all unit embeddings with the new structured format
