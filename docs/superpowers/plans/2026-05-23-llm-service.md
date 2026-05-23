# LLM Communication Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a domain-agnostic NestJS `LlmService` in the backend that wraps the Anthropic API, following the same pattern as `EmbeddingsService`.

**Architecture:** New `llm/` module in `apps/backend/src/` with config, service, and module files. Interface is fully provider-agnostic — no Anthropic types leak out. Callers pass a plain string message; service builds the Anthropic request internally.

**Tech Stack:** NestJS, `@anthropic-ai/sdk`, `@nestjs/config`, MSW for tests, Vitest.

---

### Task 1: Add `@anthropic-ai/sdk` to backend

**Files:**

- Modify: `apps/backend/package.json`

- [ ] **Step 1: Add the dependency**

In `apps/backend/package.json`, add to `"dependencies"`:

```json
"@anthropic-ai/sdk": "0.80.0"
```

- [ ] **Step 2: Install**

```bash
cd apps/backend && pnpm install
```

Expected: resolves without errors, `@anthropic-ai/sdk` appears in `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore: add @anthropic-ai/sdk to backend"
```

---

### Task 2: Create `llm.config.ts`

**Files:**

- Create: `apps/backend/src/llm/llm.config.ts`

- [ ] **Step 1: Write the config**

```typescript
import { registerAs } from "@nestjs/config";

export const llmConfig = registerAs("llm", () => ({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
}));
```

This mirrors `apps/backend/src/embeddings/embeddings.config.ts` exactly.

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/llm/llm.config.ts
git commit -m "feat: add LLM config"
```

---

### Task 3: Write failing tests for `LlmService`

**Files:**

- Create: `apps/backend/src/llm/llm.service.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { llmConfig } from "./llm.config";
import { LlmService } from "./llm.service";

const server = setupServer();

describe("LlmService", () => {
  let service: LlmService;

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(llmConfig)],
      providers: [LlmService],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  it("should return joined text when createMessage is called", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({
          content: [{ type: "text", text: "Hello, world!" }],
          stop_reason: "end_turn",
        }),
      ),
    );

    const result = await service.createMessage({
      model: "haiku",
      maxTokens: 256,
      message: "Say hello",
    });

    expect(result).toBe("Hello, world!");
  });

  it("should join multiple text blocks when createMessage returns multiple blocks", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({
          content: [
            { type: "text", text: "Part one. " },
            { type: "text", text: "Part two." },
          ],
          stop_reason: "end_turn",
        }),
      ),
    );

    const result = await service.createMessage({
      model: "haiku",
      maxTokens: 256,
      message: "Say something in two parts",
    });

    expect(result).toBe("Part one. Part two.");
  });

  it("should throw when createMessage is called with invalid API key", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json(
          {
            error: { type: "authentication_error", message: "Invalid API key" },
          },
          { status: 401 },
        ),
      ),
    );

    await expect(
      service.createMessage({
        model: "haiku",
        maxTokens: 256,
        message: "Say hello",
      }),
    ).rejects.toThrow();
  });

  it("should pass system prompt when provided", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(
        "https://api.anthropic.com/v1/messages",
        async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            content: [{ type: "text", text: "Response" }],
            stop_reason: "end_turn",
          });
        },
      ),
    );

    await service.createMessage({
      model: "haiku",
      maxTokens: 128,
      system: "You are a helpful assistant.",
      message: "Say something",
    });

    expect(capturedBody).toMatchObject({
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Say something" }],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test -- llm.service
```

Expected: FAIL — `Cannot find module './llm.service'`

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/llm/llm.service.spec.ts
git commit -m "test: add failing tests for LlmService"
```

---

### Task 4: Implement `LlmService`

**Files:**

- Create: `apps/backend/src/llm/llm.service.ts`

- [ ] **Step 1: Write the service**

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { llmConfig } from "./llm.config";

type LlmModel = "haiku";

const MODEL_MAP: Record<LlmModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
};

export type CreateMessageParams = {
  model: LlmModel;
  maxTokens: number;
  system?: string;
  message: string;
};

@Injectable()
export class LlmService {
  private readonly client: Anthropic;

  constructor(
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  async createMessage(params: CreateMessageParams): Promise<string> {
    const response = await this.client.messages.create({
      model: MODEL_MAP[params.model],
      max_tokens: params.maxTokens,
      ...(params.system ? { system: params.system } : {}),
      messages: [{ role: "user", content: params.message }],
    });

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.TextBlock).text)
      .join("");
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test -- llm.service
```

Expected: all 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/llm/llm.service.ts
git commit -m "feat: implement LlmService"
```

---

### Task 5: Create `LlmModule`

**Files:**

- Create: `apps/backend/src/llm/llm.module.ts`

- [ ] **Step 1: Write the module**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { llmConfig } from "./llm.config";
import { LlmService } from "./llm.service";

@Module({
  imports: [ConfigModule.forFeature(llmConfig)],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
```

- [ ] **Step 2: Run full test suite**

```bash
cd apps/backend && pnpm test
```

Expected: all tests PASS.

- [ ] **Step 3: Typecheck**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/llm/llm.module.ts
git commit -m "feat: add LlmModule"
```
