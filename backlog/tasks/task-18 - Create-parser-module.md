---
id: TASK-18
title: Create parser module
status: In Progress
assignee: []
created_date: "2026-05-24"
updated_date: "2026-05-25 08:07"
labels: []
milestone: m-0
dependencies:
  - TASK-15
  - TASK-17
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Migrate `apps/web/src/lib/llm/parser.ts` into a NestJS `ParseModule`, decomposing the monolithic `parsePrompt` function into focused, testable services. This is the most complex piece — it orchestrates two LLM calls and a unit resolution step.

**Current flow in `parsePrompt`:**

1. Fetch all factions from DB
2. **LLM call 1 (context extraction)** — send prompt + factions list to Claude Haiku, extract `ParsedContext` (attacker/defender names, counts, phase, faction hints, weapon hints)
3. **Unit resolution** — embed attacker and defender description texts, vector-search the DB, re-rank with fuzzy name match to get `UnitProfile` objects
4. **LLM call 2 (weapon resolution, conditional)** — if weapon hints present, send unit weapon lists to Claude Haiku and match hints to actual weapon IDs
5. Assemble and return `CombatFormState`

**Decomposition into services:**

- `ContextExtractionService` — wraps LLM call 1. Builds the system prompt with factions context, calls `LlmService.createMessage`, parses JSON response into `ParsedContext`. Also owns `parseContextFromJson` and `parseWeaponHints` helpers.
- `UnitResolutionService` — wraps unit resolution. Calls `EmbeddingsService` to embed query texts (built with `buildUnitEmbeddingText`), calls `UnitsService` for vector search and fuzzy match, returns resolved `UnitProfile` pair.
- `WeaponResolutionService` — wraps LLM call 2. Builds weapon system prompt, calls `LlmService.createMessage`, parses JSON into `WeaponResolution`. Owns `buildWeaponSystemPrompt`, `parseWeaponList`, and `normalizeWeaponName` helpers.
- `ParseService` — top-level orchestrator. Injects the three services above plus `FactionsService`, runs the full flow, returns `CombatFormState`.

`buildUnitEmbeddingText` (currently in `apps/web/src/lib/embeddings/units/`) moves into this module (e.g. `src/parse/unit-embedding-text.ts`) since it is only used here.

**NestJS wiring:**

- `ParseController` — `POST /parse`, accepts `{ prompt: string }`, returns `CombatFormState`
- `ParseModule` — declares controller, provides all four services, imports `LlmModule`, `EmbeddingsModule`, `UnitsModule`

**Note:** `LlmService.createMessage` currently does not support the `cache_control` parameter used in LLM call 2 (`resolveWeapons`). Extend `LlmService` (TASK-12) as needed when implementing this module.

<!-- SECTION:DESCRIPTION:END -->
