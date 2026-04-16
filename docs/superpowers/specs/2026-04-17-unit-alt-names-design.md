# Unit Alt Names Design

**Date**: 2026-04-17  
**Goal**: Improve unit search accuracy by generating alternative names for units and baking them into embeddings.

## Problem

Embedding-based unit search fails for common informal references. "Intercessors" matches "Assault Intercessors With Jump Packs" instead of "Intercessor Squad" because the plural form "intercessors" only appears in the full name of the former. Alt names fix this by enriching the embedding text with the natural ways players refer to each unit.

## DB Schema

Add nullable `alt_names text[]` column to the `units` table.

**Prisma**:

```prisma
altNames    String[]?   @map("alt_names")
```

**Migration**:

```sql
ALTER TABLE units ADD COLUMN alt_names text[];
```

`null` means no viable alt name exists (e.g. single-word named characters like "Azrael"). This is distinct from an empty array, which is not used.

## Alt Name Generation

### New file: `scripts/import-wahapedia/alt-names.ts`

Exports one function:

```typescript
generateAltNames(
  units: { id: string; name: string }[],
  faction: string
): Promise<{ id: string; altNames: string[] | null }[]>
```

- Units are chunked into groups of 30.
- All chunks for a faction are called **in parallel** (`Promise.all`) to keep import fast — SM has 300+ units (10+ chunks).
- Each chunk fires one LLM call (Claude Haiku) with the faction name as context.
- Response is structured JSON: `{ unitName: string, altNames: string[] | null }[]`. The function maps results back to unit IDs by matching `unitName` exactly against the names supplied in the chunk. Unmatched names are logged as a warning and skipped.

### LLM Prompt

System prompt explains the task and provides examples of good alt name strategies:

1. **Pluralize + drop squad suffix**: `"Intercessor Squad"` → `["Intercessors"]`, `"Devastator Squad"` → `["Devastators"]`
2. **Shorten multi-word compound names**: `"Assault Intercessors With Jump Packs"` → `["Jump Intercessors", "Assault Intercessors"]`
3. **Add or remove faction qualifier**: `"Intercessor Squad"` → `["Space Marine Intercessors"]`
4. **Named characters**: generate 1–2 alt names using first name, last name, or common title — `"Marneus Calgar"` → `["Marneus", "Calgar"]`, `"Lion El'Jonson"` → `["The Lion", "Lion"]`. Return `null` when no natural shortening exists (single-word names like `"Azrael"`).

Generate **up to 3** alt names per unit. Fewer is fine when not all strategies apply.

## Import Pipeline Integration

In `scripts/import-wahapedia/index.ts`, after the existing `upsertAll()` step:

1. Group upserted units by faction (available from transform output).
2. For each faction, call `generateAltNames(units, factionName)`.
3. Update `alt_names` in DB for all returned units (loop of `prisma.unit.update` calls).

After import, `generate-embeddings` must be re-run to regenerate embeddings with the new alt names baked in.

## `buildUnitEmbeddingText` Extension

Add `altNames?: string[] | null` as the **second parameter** in `UnitEmbeddingParams`:

```typescript
export type UnitEmbeddingParams = {
  name: string;
  altNames?: string[] | null;
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};
```

If `altNames` is provided and non-empty, append to embedding text:

```
Alternative names: Intercessors, Space Marine Intercessors
```

**Usage boundary**: `altNames` is only passed from `generate-embeddings` (DB → embedding). It is never passed in the parser flow (prompt → embedding), where only the user-supplied name is available.

## `generate-embeddings` Update

Extend the DB query to select `alt_names` alongside existing fields, then pass through:

```typescript
buildUnitEmbeddingText({
  name: u.name,
  altNames: u.altNames,
  faction: factionNameById.get(u.factionId),
  meleeWeapons: [...],
  rangedWeapons: [...],
})
```

No other changes to batching, Voyage AI calls, or DB update logic.

## Data Flow Summary

```
import-wahapedia
  parse → transform → upsertAll → generateAltNames → update alt_names in DB

generate-embeddings
  fetch units (with alt_names) → buildUnitEmbeddingText → embedTexts → update embeddings

parser (runtime, unchanged)
  user prompt → extractContext → buildUnitEmbeddingText (no altNames) → embedText → searchUnitsByEmbedding
```
