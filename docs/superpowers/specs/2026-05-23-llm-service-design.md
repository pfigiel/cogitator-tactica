# LLM Communication Service Design

**Date:** 2026-05-23
**Task:** TASK-12

## Overview

Domain-agnostic NestJS injectable service wrapping the Anthropic API. Lives in `apps/backend/src/llm/`. Follows the same structure as `EmbeddingsService`.

## Architecture

New module at `apps/backend/src/llm/`:

```
llm.config.ts       — registerAs("llm", ...) with ANTHROPIC_API_KEY
llm.service.ts      — @Injectable(), wraps Anthropic SDK, exposes createMessage()
llm.module.ts       — ConfigModule.forFeature(llmConfig), provides + exports LlmService
llm.service.spec.ts — MSW intercepts api.anthropic.com/v1/messages
```

`AppModule` imports `LlmModule`.

## Service Interface

```typescript
type LlmModel = "haiku";

type CreateMessageParams = {
  model: LlmModel;
  maxTokens: number;
  system?: string;
  message: string;
};

class LlmService {
  createMessage(params: CreateMessageParams): Promise<string>;
}
```

- `model` is a string literal enum; service maps internally to the full Anthropic model ID
- `message` is a plain string; service builds `[{ role: "user", content: message }]` before calling SDK
- `system` is a plain string; no Anthropic types leak through the interface
- Returns joined text content from all response text blocks

### Internal model mapping

```typescript
const MODEL_MAP: Record<LlmModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
};
```

## Config

```typescript
// llm.config.ts
registerAs("llm", () => ({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
}));
```

Injected via `@Inject(llmConfig.KEY)` in the service constructor. Service instantiates `new Anthropic({ apiKey })`.

## Error Handling

SDK errors propagate to callers unmodified. No wrapping, no retry, no timeout config.

## Testing

MSW intercepts `https://api.anthropic.com/v1/messages` and returns stubbed JSON. Mirrors `embeddings.service.spec.ts` pattern — no SDK mocking.

## Out of Scope

- Streaming responses
- Retry / timeout configuration
- Multi-turn conversation support
- Any domain concepts (units, factions, prompts)
