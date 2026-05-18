# Embeddings Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a domain-agnostic NestJS injectable `EmbeddingsService` wrapping the Voyage AI API, configured via `ConfigService`.

**Architecture:** New `EmbeddingsModule` at `apps/backend/src/embeddings/` containing a typed config namespace and `EmbeddingsService`. `AppModule` gains a global `ConfigModule` and imports `EmbeddingsModule`.

**Tech Stack:** NestJS 11, `@nestjs/config` 4.0.4, Jest + ts-jest (existing), global `fetch`

---

## File Map

| Action | Path                                                     | Purpose                                             |
| ------ | -------------------------------------------------------- | --------------------------------------------------- |
| Modify | `apps/backend/package.json`                              | Add `@nestjs/config` production dep                 |
| Create | `apps/backend/src/embeddings/embeddings.config.ts`       | Typed config namespace for Voyage API key + model   |
| Create | `apps/backend/src/embeddings/embeddings.service.spec.ts` | Unit tests with mocked `fetch`                      |
| Create | `apps/backend/src/embeddings/embeddings.service.ts`      | Injectable service: `embedText`, `embedTexts`       |
| Create | `apps/backend/src/embeddings/embeddings.module.ts`       | Module wiring config + service                      |
| Modify | `apps/backend/src/app.module.ts`                         | Register global `ConfigModule` + `EmbeddingsModule` |

---

### Task 1: Add @nestjs/config dependency

**Files:**

- Modify: `apps/backend/package.json`

- [ ] **Step 1: Add dependency**

In `apps/backend/package.json`, add to `"dependencies"`:

```json
"@nestjs/config": "4.0.4"
```

Result (dependencies section):

```json
"dependencies": {
  "@codegenie/serverless-express": "5.0.0",
  "@nestjs/common": "11.0.0",
  "@nestjs/config": "4.0.4",
  "@nestjs/core": "11.0.0",
  "@nestjs/platform-express": "11.0.0",
  "reflect-metadata": "0.2.2",
  "rxjs": "7.8.0"
}
```

- [ ] **Step 2: Install**

Run from repo root:

```bash
pnpm install
```

Expected: lockfile updated, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore(backend): add @nestjs/config dependency"
```

---

### Task 2: Create embeddings config namespace

**Files:**

- Create: `apps/backend/src/embeddings/embeddings.config.ts`

- [ ] **Step 1: Create config file**

```typescript
import { registerAs } from "@nestjs/config";

export const embeddingsConfig = registerAs("embeddings", () => ({
  apiKey: process.env.VOYAGE_API_KEY ?? "",
  model: process.env.VOYAGE_MODEL ?? "voyage-3",
}));
```

- [ ] **Step 2: Verify typecheck passes**

Run from `apps/backend/`:

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/embeddings/embeddings.config.ts
git commit -m "feat(backend): add embeddings config namespace"
```

---

### Task 3: Write failing tests for EmbeddingsService

**Files:**

- Create: `apps/backend/src/embeddings/embeddings.service.spec.ts`

- [ ] **Step 1: Create spec file**

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";
import { EmbeddingsService } from "./embeddings.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("EmbeddingsService", () => {
  let service: EmbeddingsService;

  beforeEach(async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    process.env.VOYAGE_MODEL = "voyage-3";
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(embeddingsConfig)],
      providers: [EmbeddingsService],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  it("embedText returns first embedding", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
      }),
    });

    const result = await service.embedText("hello");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("embedTexts returns sorted embeddings", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { embedding: [0.4, 0.5], index: 1 },
          { embedding: [0.1, 0.2], index: 0 },
        ],
      }),
    });

    const result = await service.embedTexts(["first", "second"]);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.4, 0.5],
    ]);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(service.embedText("hello")).rejects.toThrow(
      "Voyage AI error 401: Unauthorized",
    );
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run from `apps/backend/`:

```bash
pnpm test
```

Expected: FAIL with `Cannot find module './embeddings.service'`

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/embeddings/embeddings.service.spec.ts
git commit -m "test(backend): add failing tests for EmbeddingsService"
```

---

### Task 4: Implement EmbeddingsService

**Files:**

- Create: `apps/backend/src/embeddings/embeddings.service.ts`

- [ ] **Step 1: Create service**

```typescript
import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";

const API_URL = "https://api.voyageai.com/v1/embeddings";

type EmbedResponse = {
  data: Array<{ embedding: number[]; index: number }>;
};

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(embeddingsConfig.KEY)
    private readonly config: ConfigType<typeof embeddingsConfig>,
  ) {}

  async embedText(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return this.embed(texts);
  }

  private async embed(input: string[]): Promise<number[][]> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ input, model: this.config.model }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Voyage AI error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as EmbedResponse;
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
```

- [ ] **Step 2: Run tests — verify they pass**

Run from `apps/backend/`:

```bash
pnpm test
```

Expected: all 3 `EmbeddingsService` tests pass alongside the existing `HealthController` test.

- [ ] **Step 3: Verify typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/embeddings/embeddings.service.ts
git commit -m "feat(backend): implement EmbeddingsService"
```

---

### Task 5: Create EmbeddingsModule

**Files:**

- Create: `apps/backend/src/embeddings/embeddings.module.ts`

- [ ] **Step 1: Create module**

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";
import { EmbeddingsService } from "./embeddings.service";

@Module({
  imports: [ConfigModule.forFeature(embeddingsConfig)],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
```

- [ ] **Step 2: Run tests — verify still passing**

Run from `apps/backend/`:

```bash
pnpm test
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/embeddings/embeddings.module.ts
git commit -m "feat(backend): add EmbeddingsModule"
```

---

### Task 6: Register ConfigModule and EmbeddingsModule in AppModule

**Files:**

- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Update AppModule**

Replace the entire file:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmbeddingsModule } from "./embeddings/embeddings.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    EmbeddingsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Run full test suite**

Run from `apps/backend/`:

```bash
pnpm test
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app.module.ts
git commit -m "feat(backend): register ConfigModule and EmbeddingsModule in AppModule"
```
