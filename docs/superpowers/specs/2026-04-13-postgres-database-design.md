# Postgres Database Design

**Date:** 2026-04-13
**Status:** Approved

## Overview

Replace the static `src/data/units.ts` file with a Postgres database backed by Prisma ORM. Units and weapons are stored in a normalized relational schema. The import pipeline writes directly to the DB instead of generating a TypeScript file.

## Stack

- **Database:** Postgres
- **ORM:** Prisma
- **Local dev:** Docker Compose (`docker compose up -d`)
- **Vector search (future):** pgvector extension

## Schema

### Enum: `Faction`

```
SM | ORK | ...
```

New values added via Prisma enum migration as new factions are imported.

### Table: `units`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | Slug derived from name (existing behavior) |
| `name` | `TEXT NOT NULL` | |
| `faction_id` | `Faction NOT NULL` | Enum, not free text |
| `toughness` | `INT NOT NULL` | |
| `save` | `INT NOT NULL` | |
| `invuln` | `INT` | Nullable |
| `wounds` | `INT NOT NULL` | |
| `keywords` | `TEXT[]` | |
| `embedding` | `vector(1536)` | Nullable; pgvector, populated in a future pass |

### Table: `weapons`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | See weapon ID strategy below |
| `name` | `TEXT NOT NULL` | |
| `type` | `ENUM (shooting, melee)` | |
| `attacks` | `TEXT NOT NULL` | DiceExpression, e.g. `"2"` or `"D6"` |
| `skill` | `INT NOT NULL` | |
| `strength` | `INT NOT NULL` | |
| `ap` | `INT NOT NULL` | |
| `damage` | `TEXT NOT NULL` | DiceExpression |
| `abilities` | `JSONB NOT NULL` | Array of `WeaponAbility` objects |
| UNIQUE | `(name, type, attacks, skill, strength, ap, damage)` | Deduplication key |

### Table: `unit_weapons` (join table)

| Column | Type | Notes |
|---|---|---|
| `unit_id` | `TEXT FK → units.id` | |
| `weapon_id` | `TEXT FK → weapons.id` | |
| PK | `(unit_id, weapon_id)` | |

### Weapon ID Strategy

The weapon `id` is derived deterministically:

1. Base = `slugify(name)`
2. If another weapon already has the same slug but different stats (same name, different profile), append a 6-char hash of `(name, type, attacks, skill, strength, ap, damage)`: e.g. `bolt_rifle_a3f29c`

Collision detection happens in-memory during the transform pass by maintaining a `Map<slug, stats>` before any DB writes. Same name + same stats always produces the same ID, making reruns idempotent.

## Local Development Setup

A `docker-compose.yml` at the repo root starts a Postgres container. The service exposes port `5432` and uses a named volume for persistence. A `.env` file (gitignored) holds `DATABASE_URL`. A `.env.example` file is committed with a placeholder value so new developers know what to set.

Developer setup flow:
1. `docker compose up -d`
2. Copy `.env.example` → `.env`, fill in credentials
3. `npx prisma migrate dev`

## Import Script Changes

### Removed
- `scripts/import-wahapedia/generate.ts` — deleted; no longer generates a `.ts` file

### Modified: `scripts/import-wahapedia/index.ts`
1. Before upsert: run `pg_dump` to `backups/YYYY-MM-DDTHH-mm-ss.dump` for rollback
2. Call the new `db.ts` upsert function inside a Prisma transaction

### Modified: `scripts/import-wahapedia/transform.ts`
- Weapon ID derivation logic added (slug + optional hash suffix)
- Collision detection via in-memory `Map<slug, stats>` during transform pass

### New: `scripts/import-wahapedia/db.ts`
Handles the full upsert in one Prisma transaction:
1. Upsert weapons (`createMany` with `skipDuplicates` on the unique constraint)
2. Upsert units
3. Upsert `unit_weapons` rows

Reads `DATABASE_URL` from env (shared with the app).

## App Code Changes

### Deleted
- `src/data/units.ts` — replaced by DB queries

### New: `src/lib/db/`

```
src/lib/db/
  index.ts      # Prisma client singleton (dev hot-reload safe)
  types.ts      # Db-prefixed types derived from Prisma generated types
  units.ts      # getUnit(id), listUnits() query functions
```

**Naming convention:** Prisma-derived types use a `Db` prefix (`DbUnit`, `DbWeapon`, `DbUnitWithWeapons`) to distinguish them from domain types (`UnitProfile`, `WeaponProfile`). Domain types remain in `src/lib/calculator/types.ts` and are not DB-aware.

A thin mapping layer in `src/lib/db/units.ts` converts `DbUnitWithWeapons` → `UnitProfile` at the query boundary. No DB types leak into the calculator engine or UI.

### Modified: `src/lib/llm/parser.ts`
- Remove static imports of `UNITS` and `UNIT_LIST`
- `listUnits()` (selecting `id` + `name` only) replaces `UNIT_LIST` for building the LLM system prompt
- `getUnit(id)` with nested weapons replaces direct `UNITS[id]` lookups
- `parsePrompt` is already async — no signature change needed

## Future: Vector Search

- `pgvector` extension enabled in the initial Prisma migration
- `embedding vector(1536)` column added to `units` as `Unsupported("vector(1536)")` in Prisma schema
- Column is nullable; a separate future script populates embeddings via an embedding model
- No application code changes required now beyond the column existing
