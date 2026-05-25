---
id: TASK-17
title: Create units module
status: Done
assignee: []
created_date: "2026-05-24"
updated_date: "2026-05-25 08:07"
labels: []
milestone: m-0
dependencies:
  - TASK-14
  - TASK-15
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Create a NestJS `UnitsModule` that owns all unit and faction data access: queries, DB-to-domain mappers, and the REST endpoints. The module injects `PrismaService` from `DatabaseModule` (TASK-14) and maps DB records to domain types from `src/common/types.ts` (TASK-15).

**Source files to migrate:**

- `apps/web/src/lib/db/units.ts` — `listUnits`, `getUnit`, `searchUnitsByEmbedding` (raw pgvector SQL via `Prisma.raw`), `searchUnitsByFuzzyNameMatch` (fuse.js)
- `apps/web/src/lib/db/factions.ts` — `getAllFactions`
- `apps/web/src/lib/db/types.ts` — `toUnitProfile`, `toWeaponProfile`, `DbUnit`, `DbWeapon`, `DbUnitWithWeapons`

**NestJS wiring:**

- `UnitsService` — injectable service exposing `listUnits`, `getUnit`, `searchUnitsByEmbedding`, `searchUnitsByFuzzyNameMatch`
- `FactionsService` — injectable service exposing `getAllFactions`
- `UnitsController` — `GET /units` (list), `GET /units/:id` (single unit with full `UnitProfile`)
- `UnitsModule` — provides and exports both services, declares controller, imports `DatabaseModule`

The `searchUnitsByEmbedding` query uses raw SQL with the pgvector `<=>` operator — ensure the Prisma raw query approach is preserved and compatible with the NestJS Prisma setup from TASK-14.

<!-- SECTION:DESCRIPTION:END -->
