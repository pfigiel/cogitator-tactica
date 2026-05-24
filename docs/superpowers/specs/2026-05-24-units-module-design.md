# Units Module Design

**Date:** 2026-05-24  
**Task:** TASK-17  
**Status:** Approved

## Overview

Create a NestJS `UnitsModule` in `apps/backend` that owns all unit and faction data access: queries, DB-to-domain mappers, and REST endpoints. Migrates logic from `apps/web/src/lib/db/`.

## File Structure

```
apps/backend/src/units/
  units.module.ts          — imports DatabaseModule, provides/exports both services + declares controller
  units.controller.ts      — GET /units, GET /units/:id
  units.controller.spec.ts
  units.service.ts         — listUnits, getUnit, searchUnitsByEmbedding, searchUnitsByFuzzyNameMatch
  units.service.spec.ts
  factions.service.ts      — getAllFactions; FactionRecord type defined here
  factions.service.spec.ts
```

`AppModule` gains `UnitsModule` in its imports array.

## Dependencies

- `fuse.js` added to `apps/backend/package.json` (exact version, no `^` or `~`)
- `DatabaseModule` (TASK-14) imported by `UnitsModule`
- Domain types (`UnitProfile`, `WeaponProfile`, etc.) from `src/common/types.ts` (TASK-15)

## DB Types & Mappers

`DbUnit`, `DbWeapon`, `DbUnitWithWeapons` (Prisma payload types) are defined in `apps/backend/src/database/types.ts` and exported from `DatabaseModule`. Feature services import them from there.

Mappers (`toUnitProfile`, `toWeaponProfile`, `parseDiceExpr`) are **private** to `units.service.ts` — units-specific, no other module needs them.

`FactionRecord` type (`{ id: string; name: string }`) is defined in `factions.service.ts`.

## Endpoints

| Method | Path         | Handler                       | Response                              |
| ------ | ------------ | ----------------------------- | ------------------------------------- |
| GET    | `/units`     | `UnitsController.listUnits()` | `Array<{ id: string; name: string }>` |
| GET    | `/units/:id` | `UnitsController.getUnit(id)` | `UnitProfile` or 404                  |

No REST endpoints for factions or search methods — service-only for internal use by other modules.

## Service Methods

### UnitsService

- `listUnits()` — `prisma.unit.findMany({ select: { id, name }, orderBy: { name: 'asc' } })`
- `getUnit(id)` — `prisma.unit.findUnique()` with weapons included, maps via `toUnitProfile`, returns `null` if not found
- `searchUnitsByEmbedding(embedding, limit?, factionId?)` — raw SQL with pgvector `<=>` via `prisma.$queryRaw`, returns `Array<{ id, name, altNames }>`
- `searchUnitsByFuzzyNameMatch(unitName, candidates)` — pure fuse.js wrapper, no DB call, returns best `UnitSearchResult | undefined`

### FactionsService

- `getAllFactions()` — `prisma.faction.findMany({ select: { id, name } })`, returns `FactionRecord[]`

## Testing

All tests use `vi.spyOn` to mock `PrismaService`. Test names follow `"should ... when ..."`. AAA sections separated by blank lines.

- `units.service.spec.ts`: listUnits returns mapped array; getUnit returns UnitProfile when found, null when not; searchUnitsByEmbedding calls `$queryRaw` with correct SQL shape; searchUnitsByFuzzyNameMatch returns best match from candidates
- `factions.service.spec.ts`: getAllFactions returns FactionRecord[]
- `units.controller.spec.ts`: mocks UnitsService; GET /units returns list; GET /units/:id returns unit or 404
