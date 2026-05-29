---
id: TASK-10
title: Move application logic to NestJS app
status: Done
assignee: []
created_date: "2026-05-13 19:10"
updated_date: "2026-05-29 07:48"
labels: []
milestone: m-0
dependencies: []
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Move existing backend logic from the Next app to the NestJS one. The Next backend was written quickly as a PoC and should be cleaned up and implemented properly during migration — proper separation of concerns, best practices throughout.

**Do not remove the existing Next logic yet** — NestJS should mirror functionality first.

**Prerequisites (done):**

- TASK-11 — `EmbeddingsModule` with `EmbeddingsService` (Voyage AI wrapper)
- TASK-12 — `LlmModule` with `LlmService` (Anthropic API wrapper)

**Subtasks:**

- TASK-14 — Database module: Prisma setup + `PrismaService` (infrastructure only)
- TASK-15 — Common domain types: shared types in `src/common/` used across feature modules
- TASK-16 — Calculator module: simulation logic + `CalculatorService` + `POST /calculate`
- TASK-17 — Units module: unit/faction queries, mappers, `GET /units`, `GET /units/:id`
- TASK-18 — Parser module: decomposed parse orchestration + `POST /parse`

<!-- SECTION:DESCRIPTION:END -->
