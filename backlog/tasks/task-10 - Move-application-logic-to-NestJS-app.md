---
id: TASK-10
title: Move application logic to NestJS app
status: To Do
assignee: []
created_date: "2026-05-13 19:10"
labels: []
dependencies: []
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Move existing backend logic from the Next app to the NestJS one. The Next backend was written quickly as a PoC and should be cleaned up and implemented properly during migration — proper separation of concerns, best practices throughout.

The infrastructure services for embeddings (TASK-11) and LLM communication (TASK-12) are handled separately and can be treated as prerequisites or developed in parallel.

**What needs to move:**

**Endpoints** — three Next API routes to migrate:

- `POST /api/parse` — accepts a natural language prompt, returns a populated `CombatFormState`
- `GET /api/units` — returns all units (id + name)
- `GET /api/units/:id` — returns a full `UnitProfile` for a given unit

**Database layer** (`lib/db/`) — Prisma client singleton, unit and faction queries (`listUnits`, `getUnit`, `searchUnitsByEmbedding`, `searchUnitsByFuzzyNameMatch`, `getAllFactions`), and DB-to-domain mappers. The NestJS app will need its own Prisma setup.

**Prompt parsing / context resolution** (`lib/llm/parser.ts`) — the most complex piece. `parsePrompt` orchestrates two LLM calls (context extraction and weapon resolution) and a unit resolution step that combines vector search and fuzzy name matching. It is tightly coupled to domain concepts and will need to be split into well-structured, testable services built on top of TASK-11 and TASK-12.

**Combat calculator** (`lib/calculator/`) — pure TypeScript simulation logic with no framework dependencies. Runs 10,000 Monte Carlo trials per weapon to compute average damage/models slain. The logic itself is reasonably clean but should be wrapped in a proper NestJS service. Special care should be taken to ensure the simulation code remains readable and well-tested.

**Do not remove the existing Next logic yet** — NestJS should mirror functionality first.

<!-- SECTION:DESCRIPTION:END -->
