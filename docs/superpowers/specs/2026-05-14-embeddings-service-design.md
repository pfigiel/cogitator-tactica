# Embeddings Service Design

**Date:** 2026-05-14
**Task:** TASK-11

## Overview

Domain-agnostic NestJS injectable service wrapping the Voyage AI embeddings API. Replaces the bare HTTP client in `apps/web/src/lib/embeddings/common/voyage.ts` with a properly injected NestJS service in the backend app.

## Architecture

New `EmbeddingsModule` at `apps/backend/src/embeddings/`. `AppModule` registers `ConfigModule.forRoot({ isGlobal: true })` and imports `EmbeddingsModule`.

```
AppModule
  ├── ConfigModule (global)
  └── EmbeddingsModule
        └── EmbeddingsService
```

## Config Namespace

File: `apps/backend/src/embeddings/embeddings.config.ts`

Typed config factory registered via `registerAs`:

```ts
registerAs("embeddings", () => ({
  apiKey: process.env.VOYAGE_API_KEY ?? "",
  model: process.env.VOYAGE_MODEL ?? "voyage-3",
}));
```

Loaded via `ConfigModule.forFeature(embeddingsConfig)` inside `EmbeddingsModule`. Injected into the service via `@Inject(embeddingsConfig.KEY)` with full `ConfigType<typeof embeddingsConfig>` typing.

## EmbeddingsService

File: `apps/backend/src/embeddings/embeddings.service.ts`

Public API:

- `embedText(text: string): Promise<number[]>`
- `embedTexts(texts: string[]): Promise<number[][]>`

Implementation: calls Voyage AI API at `https://api.voyageai.com/v1/embeddings` (internal outgoing fetch — no REST endpoint exposed). Response sorted by index before returning. Non-ok responses throw `Error('Voyage AI error <status>: <body>')`. Logic ported verbatim from `apps/web/src/lib/embeddings/common/voyage.ts`.

## Module

File: `apps/backend/src/embeddings/embeddings.module.ts`

Registers `embeddingsConfig` via `ConfigModule.forFeature` and provides `EmbeddingsService`. Exports `EmbeddingsService` for use by other modules.

## Testing

File: `apps/backend/src/embeddings/embeddings.service.spec.ts`

Unit tests using `@nestjs/testing` + `ConfigModule.forFeature(embeddingsConfig)` with env vars set in `beforeEach`. Global `fetch` mocked. Coverage:

- `embedText` success path returns first embedding
- `embedTexts` success path returns sorted embeddings
- Non-ok response throws with correct message

## Dependencies

Add `@nestjs/config` as production dependency in `apps/backend/package.json` (exact version, no `^`).

## Out of Scope

Domain-specific logic in `apps/web/src/lib/embeddings/units/buildUnitEmbeddingText.ts` stays in the web app.
