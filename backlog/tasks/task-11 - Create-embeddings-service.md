---
id: TASK-11
title: Create embeddings service
status: Done
assignee: []
created_date: "2026-05-14"
updated_date: "2026-05-23 09:38"
labels: []
dependencies: []
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Create a domain-agnostic NestJS injectable service wrapping the Voyage AI embeddings API. The existing implementation lives in `apps/web/src/lib/embeddings/common/voyage.ts` — it's a bare HTTP client with a hardcoded model (`voyage-3`) and reads `VOYAGE_API_KEY` directly from `process.env`.

The NestJS service should:

- Expose `embedText(text: string): Promise<number[]>` and `embedTexts(texts: string[]): Promise<number[][]>` methods
- Read API key and model name via `ConfigService` instead of `process.env`
- Keep the Voyage AI HTTP call logic (sorting by index, error handling) intact

Do NOT migrate `apps/web/src/lib/embeddings/units/buildUnitEmbeddingText.ts` here — that is domain-specific logic and belongs in a higher-level domain service.

<!-- SECTION:DESCRIPTION:END -->
