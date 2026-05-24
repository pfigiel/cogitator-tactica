---
id: TASK-12
title: Create LLM communication service
status: Done
assignee: []
created_date: "2026-05-14"
updated_date: "2026-05-24 18:55"
labels: []
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Create a domain-agnostic NestJS injectable service wrapping the Anthropic API. The existing implementation in `apps/web/src/lib/llm/parser.ts` instantiates `new Anthropic()` directly and makes `client.messages.create` calls, but the file is entirely domain-specific — it contains Warhammer 40K system prompts, unit/weapon resolution logic, and calls into DB and embeddings code.

The NestJS service should extract only the provider communication layer:

- Wrap `client.messages.create` behind a clean method (e.g. `createMessage(params)`)
- Read `ANTHROPIC_API_KEY` via `ConfigService` rather than relying on the SDK's implicit env read
- Remain unaware of any domain concepts (units, factions, weapons, prompts)

All domain logic currently in `parser.ts` (prompt construction, JSON parsing, unit resolution, weapon resolution) should stay out of this service and be handled by a higher-level domain service built on top of it.

<!-- SECTION:DESCRIPTION:END -->
