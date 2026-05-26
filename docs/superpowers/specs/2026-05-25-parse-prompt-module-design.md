# ParsePromptModule Design

**Date:** 2026-05-25
**Task:** TASK-18

## Overview

Migrate `apps/web/src/lib/llm/parser.ts` into a NestJS `ParsePromptModule` in `apps/backend/src/parse-prompt/`. Decompose the monolithic `parsePrompt` function into four focused, independently testable services.

## File Structure

```
apps/backend/src/
  llm/
    llm.service.ts                    ← extend: add optional cacheControl param
  parse-prompt/
    parse-prompt.module.ts
    parse-prompt.controller.ts
    parse-prompt.service.ts           ← orchestrator
    context-extraction.service.ts
    unit-resolution.service.ts        ← buildUnitEmbeddingText as private method
    weapon-resolution.service.ts
    types.ts                          ← ParsedContext, WeaponHint, WeaponResolution
    context-extraction.service.spec.ts
    unit-resolution.service.spec.ts
    weapon-resolution.service.spec.ts
    parse-prompt.service.spec.ts
```

## LlmService Extension

Add optional `cacheControl?: boolean` to `CreateMessageParams`. When `true` and `system` is set, the system param is sent as an array block with `cache_control: { type: "ephemeral" }` instead of a plain string.

```ts
export type CreateMessageParams = {
  model: LlmModel;
  maxTokens: number;
  system?: string;
  cacheControl?: boolean;
  message: string;
};
```

## Services

### ContextExtractionService

- **Injects:** `LlmService`, `FactionsService`
- **Public:** `extract(prompt: string): Promise<ParsedContext>`
  - Fetches all factions from DB
  - Builds system prompt with factions context
  - Calls `LlmService.createMessage({ model: "haiku", maxTokens: 256, system, message: prompt })`
  - Parses JSON response into `ParsedContext`
- **Private:** `parseContextFromJson(text: string): ParsedContext`, `parseWeaponHints(raw: unknown): WeaponHint[]`

### UnitResolutionService

- **Injects:** `EmbeddingsService`, `UnitsService`, `FactionsService`
- **Public:** `resolve(ctx: ParsedContext): Promise<{ attackerUnit: UnitProfile; defenderUnit: UnitProfile }>`
  - Fetches factions from DB
  - Builds attacker/defender embedding texts (via private `buildUnitEmbeddingText`)
  - Embeds both texts in parallel via `EmbeddingsService.embedTexts`
  - Vector searches in parallel via `UnitsService.searchUnitsByEmbedding`
  - Fuzzy matches via `UnitsService.searchUnitsByFuzzyNameMatch`
  - Throws if either unit cannot be resolved
- **Private:** `buildUnitEmbeddingText(params): string`

### WeaponResolutionService

- **Injects:** `LlmService`
- **Public:** `resolve(ctx: ParsedContext, attackerUnit: UnitProfile, defenderUnit: UnitProfile, phase: "shooting" | "melee"): Promise<WeaponResolution>`
  - Builds weapon system prompt
  - Calls `LlmService.createMessage({ model: "haiku", maxTokens: 256, system, cacheControl: true, message })`
  - Parses JSON response into `WeaponResolution`
- **Private:** `buildWeaponSystemPrompt(...)`, `parseWeaponList(...)`, `normalizeWeaponName(...)`

### ParsePromptService

- **Injects:** `ContextExtractionService`, `UnitResolutionService`, `WeaponResolutionService`
- **Public:** `parse(prompt: string): Promise<CombatFormState>`
  - Calls `ContextExtractionService.extract`
  - Calls `UnitResolutionService.resolve`
  - Conditionally calls `WeaponResolutionService.resolve` (only when weapon hints present)
  - Assembles and returns `CombatFormState`

## Controller

```
POST /parse-prompt
Body: { prompt: string }
Response: CombatFormState
```

## Module Wiring

```ts
@Module({
  imports: [LlmModule, EmbeddingsModule, UnitsModule],
  controllers: [ParsePromptController],
  providers: [
    ParsePromptService,
    ContextExtractionService,
    UnitResolutionService,
    WeaponResolutionService,
  ],
})
export class ParsePromptModule {}
```

`UnitsModule` already exports `UnitsService` and `FactionsService` — no changes needed. Wire `ParsePromptModule` into `AppModule`.

## Testing

One `.spec.ts` per service, unit tests with mocked dependencies.

- **`ContextExtractionService`:** mock `LlmService` + `FactionsService`; test `parseContextFromJson` paths (valid JSON, missing fields, invalid JSON), `parseWeaponHints` (valid hints, malformed entries)
- **`UnitResolutionService`:** mock `EmbeddingsService` + `UnitsService` + `FactionsService`; test attacker-not-found throws, defender-not-found throws, successful resolution
- **`WeaponResolutionService`:** mock `LlmService`; test JSON parsing, fallback weapon paths when LLM returns no match
- **`ParsePromptService`:** mock all three services; test orchestration — weapon resolution skipped when no hints, weapon resolution called when hints present

All test names follow `"should ... when ..."` convention.
