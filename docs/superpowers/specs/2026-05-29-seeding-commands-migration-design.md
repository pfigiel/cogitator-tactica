# Seeding Commands Migration to NestJS Backend

## Overview

Migrate the database seeding scripts (`import-wahapedia`, `generate-embeddings`) from `apps/web/scripts/` to `apps/backend/` as proper NestJS CLI commands using `nestjs-commander`. Move `wahapedia-data/` CSVs to the backend. Web originals remain untouched for now.

## Architecture

### CLI Entry Point

A new `cli.ts` bootstrap file in `apps/backend/` creates a NestJS application context (no HTTP server) via `nestjs-commander`'s `CommandFactory`. A new npm script `seed:import` and `seed:embeddings` in `apps/backend/package.json` invoke it via `ts-node`.

### New: `UnitEmbeddingsService` in `UnitsModule`

Encapsulates the text construction (`buildUnitEmbeddingText`) and calls `EmbeddingsService.embedTexts`. Exported from `UnitsModule` so `SeedingModule` can use it.

### New: `SeedingModule`

Flat structure under `src/seeding/`. Contains:

- **`ImportWahapediaCommand`** — `@Command('import-wahapedia')`, accepts `--factions` option. Orchestrates: parse → transform → upsert → alt-names.
- **`GenerateEmbeddingsCommand`** — `@Command('generate-embeddings')`, accepts `--factions` option. Queries units from DB, batches embedding generation via `UnitEmbeddingsService`, writes vectors back.
- **`WahapediaParserService`** — CSV reading and parsing (`parse.ts`), data transformation (`transform.ts`), ability parsing (`abilities.ts`). Resolves `wahapedia-data/` relative to `__dirname` so invocation directory doesn't matter.
- **`WahapediaUpsertService`** — Upserts factions, weapons, and units via injected `PrismaService`. Extracted from web's `db.ts`.
- **`WahapediaAltNamesService`** — Generates alt names via injected `LlmService`. Adapted from web's `alt-names.ts` which previously called Anthropic directly.

`SeedingModule` imports: `DatabaseModule`, `LlmModule`, `EmbeddingsModule`, `UnitsModule`.

## Data Flow

### `import-wahapedia`

```
cli.ts
  → ImportWahapediaCommand
      → WahapediaParserService.parseAndTransform(factionsFilter)
          reads wahapedia-data/*.csv, parses, transforms → UnitWithFaction[]
      → WahapediaUpsertService.upsertAll(units, factions)
          writes to DB via PrismaService
      → WahapediaAltNamesService.generateAndUpdate(unitsByFaction)
          calls LlmService per faction → updates altNames in DB
```

### `generate-embeddings`

```
cli.ts
  → GenerateEmbeddingsCommand
      → PrismaService: fetch units with weapons
      → UnitEmbeddingsService.generateAndStore(units, factionNameById)
          builds text per unit → EmbeddingsService.embedTexts (batched)
          → raw SQL vector upsert via PrismaService.$executeRaw
```

## File Structure

```
apps/backend/
  cli.ts
  wahapedia-data/               # CSVs copied from apps/web/wahapedia-data/
  src/
    units/
      unit-embeddings.service.ts   # NEW
      unit-embeddings.service.spec.ts
      ... (existing files unchanged)
    seeding/
      seeding.module.ts
      import-wahapedia.command.ts
      generate-embeddings.command.ts
      wahapedia-parser.service.ts
      wahapedia-upsert.service.ts
      wahapedia-alt-names.service.ts
```

## Dependencies

Add to `apps/backend/package.json`:

- `nestjs-commander` (runtime)
- `@types/nestjs-commander` is not needed — package ships its own types

## npm Scripts

```json
"seed:import": "ts-node cli.ts import-wahapedia",
"seed:embeddings": "ts-node cli.ts generate-embeddings"
```

Both accept `--factions=SM,ORKS` to filter by faction.

## Error Handling

Commands follow existing script behavior: log warnings for unknown abilities or missing LLM responses, do not abort the full run. Same semantics as web scripts today.

## Testing

- `WahapediaParserService` — unit tests for CSV parsing and transformation (port existing `abilities.test.ts`, `alt-names.test.ts`, `transform.test.ts`)
- `WahapediaUpsertService`, `WahapediaAltNamesService`, `UnitEmbeddingsService` — unit tests with mocked `PrismaService` / `LlmService` / `EmbeddingsService`
- Commands — no unit tests (thin orchestration only)
