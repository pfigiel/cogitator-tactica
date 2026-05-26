# ParsePromptModule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `apps/web/src/lib/llm/parser.ts` into a NestJS `ParsePromptModule` at `apps/backend/src/parse-prompt/`, decomposing the monolithic function into four focused, independently testable services.

**Architecture:** `ParsePromptService` orchestrates three services — `ContextExtractionService` (LLM call 1: context), `UnitResolutionService` (vector search + fuzzy match), and `WeaponResolutionService` (LLM call 2: weapons, conditional). Each service encapsulates one responsibility and is independently unit-testable with mocked dependencies. `LlmService` is extended with an optional `cacheControl` param used by weapon resolution.

**Tech Stack:** NestJS, Vitest, `@nestjs/testing`, `msw` (for LlmService integration tests), TypeScript, Anthropic SDK, Prisma (via injected services)

---

## File Map

| Action | Path                                                               |
| ------ | ------------------------------------------------------------------ |
| Modify | `apps/backend/src/llm/llm.service.ts`                              |
| Modify | `apps/backend/src/llm/llm.service.spec.ts`                         |
| Modify | `apps/backend/src/units/factions.service.ts`                       |
| Create | `apps/backend/src/parse-prompt/types.ts`                           |
| Create | `apps/backend/src/parse-prompt/context-extraction.service.ts`      |
| Create | `apps/backend/src/parse-prompt/context-extraction.service.spec.ts` |
| Create | `apps/backend/src/parse-prompt/unit-resolution.service.ts`         |
| Create | `apps/backend/src/parse-prompt/unit-resolution.service.spec.ts`    |
| Create | `apps/backend/src/parse-prompt/weapon-resolution.service.ts`       |
| Create | `apps/backend/src/parse-prompt/weapon-resolution.service.spec.ts`  |
| Create | `apps/backend/src/parse-prompt/parse-prompt.service.ts`            |
| Create | `apps/backend/src/parse-prompt/parse-prompt.service.spec.ts`       |
| Create | `apps/backend/src/parse-prompt/parse-prompt.controller.ts`         |
| Create | `apps/backend/src/parse-prompt/parse-prompt.module.ts`             |
| Modify | `apps/backend/src/app.module.ts`                                   |

---

## Task 1: Export FactionRecord + Extend LlmService with cacheControl

**Files:**

- Modify: `apps/backend/src/units/factions.service.ts`
- Modify: `apps/backend/src/llm/llm.service.ts`
- Modify: `apps/backend/src/llm/llm.service.spec.ts`

- [ ] **Step 1: Write the failing test for cacheControl**

Add this test to the bottom of the existing `describe("LlmService")` block in `apps/backend/src/llm/llm.service.spec.ts`:

```ts
it("should send system as array block with cache_control when cacheControl is true", async () => {
  let capturedBody: unknown;

  server.use(
    http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
      capturedBody = await request.json();
      return HttpResponse.json({
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
      });
    }),
  );

  await service.createMessage({
    model: "haiku",
    maxTokens: 128,
    system: "You are helpful.",
    cacheControl: true,
    message: "Hello",
  });

  expect(capturedBody).toMatchObject({
    system: [
      {
        type: "text",
        text: "You are helpful.",
        cache_control: { type: "ephemeral" },
      },
    ],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && pnpm test llm.service.spec.ts
```

Expected: FAIL — `cacheControl` does not exist on `CreateMessageParams`

- [ ] **Step 3: Export FactionRecord from FactionsService**

In `apps/backend/src/units/factions.service.ts`, change the local type to an export:

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export type FactionRecord = { id: string; name: string };

@Injectable()
export class FactionsService {
  constructor(private readonly prisma: PrismaService) {}

  getAllFactions(): Promise<FactionRecord[]> {
    return this.prisma.faction.findMany({ select: { id: true, name: true } });
  }
}
```

- [ ] **Step 4: Extend LlmService with cacheControl**

Replace the contents of `apps/backend/src/llm/llm.service.ts` with:

```ts
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
  cacheControl?: boolean;
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
    const systemParam =
      params.system && params.cacheControl
        ? [
            {
              type: "text" as const,
              text: params.system,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : params.system;

    const response = await this.client.messages.create({
      model: MODEL_MAP[params.model],
      max_tokens: params.maxTokens,
      ...(systemParam ? { system: systemParam } : {}),
      messages: [{ role: "user", content: params.message }],
    });

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.TextBlock).text)
      .join("");
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd apps/backend && pnpm test llm.service.spec.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/llm/llm.service.ts apps/backend/src/llm/llm.service.spec.ts apps/backend/src/units/factions.service.ts
git commit -m "feat: extend LlmService with cacheControl and export FactionRecord"
```

---

## Task 2: Create parse-prompt/types.ts

**Files:**

- Create: `apps/backend/src/parse-prompt/types.ts`

- [ ] **Step 1: Create the types file**

Create `apps/backend/src/parse-prompt/types.ts`:

```ts
import type { SelectedWeapon } from "../common/types";

export type WeaponHint = { name: string; count?: number };

export type ParsedContext = {
  attackerName: string;
  defenderName: string;
  attackerCount: number;
  defenderCount: number;
  phase: "shooting" | "melee";
  defenderInCover: boolean;
  firstFighter: "attacker" | "defender";
  attackerWeaponHints: WeaponHint[];
  defenderWeaponHints: WeaponHint[];
  attackerFactionId?: string;
  defenderFactionId?: string;
};

export type WeaponResolution = {
  attackerWeapons: SelectedWeapon[];
  defenderWeapons: SelectedWeapon[];
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/parse-prompt/types.ts
git commit -m "feat: add parse-prompt types"
```

---

## Task 3: ContextExtractionService

**Files:**

- Create: `apps/backend/src/parse-prompt/context-extraction.service.ts`
- Create: `apps/backend/src/parse-prompt/context-extraction.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/parse-prompt/context-extraction.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { ContextExtractionService } from "./context-extraction.service";
import { LlmService } from "../llm/llm.service";
import { FactionsService } from "../units/factions.service";

describe("ContextExtractionService", () => {
  let service: ContextExtractionService;
  let llmService: LlmService;
  let factionsService: FactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextExtractionService,
        {
          provide: LlmService,
          useValue: { createMessage: vi.fn() },
        },
        {
          provide: FactionsService,
          useValue: { getAllFactions: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ContextExtractionService>(ContextExtractionService);
    llmService = module.get<LlmService>(LlmService);
    factionsService = module.get<FactionsService>(FactionsService);
  });

  describe("extract", () => {
    it("should return ParsedContext when LLM returns valid JSON", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([
        { id: "f1", name: "Space Marines" },
      ]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerName: "Intercessors",
          defenderName: "Boyz",
          attackerCount: 5,
          defenderCount: 10,
          phase: "shooting",
          defenderInCover: false,
          firstFighter: "attacker",
          attackerWeaponHints: [],
          defenderWeaponHints: [],
          attackerFactionId: null,
          defenderFactionId: null,
        }),
      );

      const result = await service.extract("5 Intercessors shoot 10 Boyz");

      expect(result).toMatchObject({
        attackerName: "Intercessors",
        defenderName: "Boyz",
        attackerCount: 5,
        defenderCount: 10,
        phase: "shooting",
        defenderInCover: false,
        firstFighter: "attacker",
        attackerWeaponHints: [],
        defenderWeaponHints: [],
        attackerFactionId: undefined,
        defenderFactionId: undefined,
      });
    });

    it("should pass factions context and prompt to LlmService when extract is called", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([
        { id: "f1", name: "Space Marines" },
      ]);
      const createMessage = vi
        .spyOn(llmService, "createMessage")
        .mockResolvedValue(
          JSON.stringify({
            attackerName: "A",
            defenderName: "B",
            attackerCount: 1,
            defenderCount: 1,
            phase: "shooting",
            defenderInCover: false,
            firstFighter: "attacker",
            attackerWeaponHints: [],
            defenderWeaponHints: [],
            attackerFactionId: null,
            defenderFactionId: null,
          }),
        );

      await service.extract("A vs B");

      expect(createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "haiku",
          message: "A vs B",
          system: expect.stringContaining("Space Marines"),
        }),
      );
    });

    it("should parse weapon hints when LLM returns weapon arrays", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerName: "Intercessors",
          defenderName: "Boyz",
          attackerCount: 5,
          defenderCount: 10,
          phase: "shooting",
          defenderInCover: false,
          firstFighter: "attacker",
          attackerWeaponHints: [{ name: "Bolt Rifle", count: 3 }],
          defenderWeaponHints: [{ name: "Choppa" }],
          attackerFactionId: null,
          defenderFactionId: null,
        }),
      );

      const result = await service.extract("some prompt");

      expect(result.attackerWeaponHints).toEqual([
        { name: "Bolt Rifle", count: 3 },
      ]);
      expect(result.defenderWeaponHints).toEqual([{ name: "Choppa" }]);
    });

    it("should throw when LLM returns response without attackerName", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({ defenderName: "Boyz" }),
      );

      await expect(service.extract("bad prompt")).rejects.toThrow(
        "Missing required fields",
      );
    });

    it("should throw when LLM returns response with no JSON object", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        "Sorry, I cannot help with that.",
      );

      await expect(service.extract("bad prompt")).rejects.toThrow(
        "No JSON object found",
      );
    });

    it("should default phase to shooting when LLM returns unknown phase value", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerName: "A",
          defenderName: "B",
          attackerCount: 1,
          defenderCount: 1,
          phase: "unknown",
          defenderInCover: false,
          firstFighter: "attacker",
          attackerWeaponHints: [],
          defenderWeaponHints: [],
          attackerFactionId: null,
          defenderFactionId: null,
        }),
      );

      const result = await service.extract("A vs B");

      expect(result.phase).toBe("shooting");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test context-extraction.service.spec.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement ContextExtractionService**

Create `apps/backend/src/parse-prompt/context-extraction.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { FactionsService, FactionRecord } from "../units/factions.service";
import type { ParsedContext, WeaponHint } from "./types";

@Injectable()
export class ContextExtractionService {
  constructor(
    private readonly llmService: LlmService,
    private readonly factionsService: FactionsService,
  ) {}

  async extract(prompt: string): Promise<ParsedContext> {
    const factions = await this.factionsService.getAllFactions();
    const system = this.buildSystemPrompt(factions);
    const rawText = await this.llmService.createMessage({
      model: "haiku",
      maxTokens: 256,
      system,
      message: prompt,
    });
    return this.parseContextFromJson(rawText);
  }

  private buildSystemPrompt(factions: FactionRecord[]): string {
    const factionsContext = factions
      .map((f) => `- ${f.name} (id: "${f.id}")`)
      .join("\n");

    return `You are a Warhammer 40,000 combat assistant. Extract combat parameters from the user's prompt.

Return a JSON object with:
- "attackerName": string — the attacker unit name as mentioned by the user
- "defenderName": string — the defender unit name as mentioned by the user
- "attackerCount": number — number of attacking models (default 1)
- "defenderCount": number — number of defending models (default 1)
- "phase": "shooting" | "melee" (default "shooting")
- "defenderInCover": boolean (default false)
- "firstFighter": "attacker" | "defender" (default "attacker")
- "attackerWeaponHints": array of { "name": string, "count": number | null } — weapons mentioned for the attacker; set "count" ONLY when a number is directly and explicitly stated in the prompt for that specific weapon; otherwise omit or set null. Never guess, infer, or distribute the total model count.
- "defenderWeaponHints": array of { "name": string, "count": number | null } — same rules as attackerWeaponHints
- "attackerFactionId": string | null — faction id ONLY if the attacker's faction is explicitly named in the prompt; null otherwise
- "defenderFactionId": string | null — faction id ONLY if the defender's faction is explicitly named in the prompt; null otherwise

Known factions:
${factionsContext}

IMPORTANT: Only return a faction id when you are certain the user explicitly stated that faction. If the faction is implied, guessed, or not mentioned at all, return null.

Return only a JSON object, no other text.`;
  }

  private parseWeaponHints(raw: unknown): WeaponHint[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (!item || typeof item !== "object" || typeof item.name !== "string")
        return [];
      const hint: WeaponHint = { name: item.name };
      if (item.count != null && Number.isFinite(Number(item.count)))
        hint.count = Math.max(1, Number(item.count));
      return [hint];
    });
  }

  private parseContextFromJson(text: string): ParsedContext {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON object found in: ${text}`);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      throw new Error(`Invalid JSON: ${text}`);
    }

    if (!parsed.attackerName || !parsed.defenderName) {
      throw new Error(
        `Missing required fields attackerName/defenderName: ${text}`,
      );
    }

    return {
      attackerName: String(parsed.attackerName),
      defenderName: String(parsed.defenderName),
      attackerCount: Math.max(1, Number(parsed.attackerCount) || 1),
      defenderCount: Math.max(1, Number(parsed.defenderCount) || 1),
      phase: parsed.phase === "melee" ? "melee" : "shooting",
      defenderInCover: Boolean(parsed.defenderInCover),
      firstFighter:
        parsed.firstFighter === "defender" ? "defender" : "attacker",
      attackerWeaponHints: this.parseWeaponHints(parsed.attackerWeaponHints),
      defenderWeaponHints: this.parseWeaponHints(parsed.defenderWeaponHints),
      attackerFactionId:
        typeof parsed.attackerFactionId === "string"
          ? parsed.attackerFactionId
          : undefined,
      defenderFactionId:
        typeof parsed.defenderFactionId === "string"
          ? parsed.defenderFactionId
          : undefined,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test context-extraction.service.spec.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/parse-prompt/context-extraction.service.ts apps/backend/src/parse-prompt/context-extraction.service.spec.ts
git commit -m "feat: add ContextExtractionService"
```

---

## Task 4: UnitResolutionService

**Files:**

- Create: `apps/backend/src/parse-prompt/unit-resolution.service.ts`
- Create: `apps/backend/src/parse-prompt/unit-resolution.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/parse-prompt/unit-resolution.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { UnitResolutionService } from "./unit-resolution.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { UnitsService } from "../units/units.service";
import { FactionsService } from "../units/factions.service";
import type { UnitProfile } from "../common/types";
import type { ParsedContext } from "./types";

const makeCtx = (overrides: Partial<ParsedContext> = {}): ParsedContext => ({
  attackerName: "Intercessors",
  defenderName: "Boyz",
  attackerCount: 5,
  defenderCount: 10,
  phase: "shooting",
  defenderInCover: false,
  firstFighter: "attacker",
  attackerWeaponHints: [],
  defenderWeaponHints: [],
  ...overrides,
});

const makeUnit = (id: string, name: string): UnitProfile => ({
  id,
  name,
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
});

describe("UnitResolutionService", () => {
  let service: UnitResolutionService;
  let embeddingsService: EmbeddingsService;
  let unitsService: UnitsService;
  let factionsService: FactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitResolutionService,
        {
          provide: EmbeddingsService,
          useValue: { embedTexts: vi.fn() },
        },
        {
          provide: UnitsService,
          useValue: {
            searchUnitsByEmbedding: vi.fn(),
            searchUnitsByFuzzyNameMatch: vi.fn(),
            getUnit: vi.fn(),
          },
        },
        {
          provide: FactionsService,
          useValue: { getAllFactions: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<UnitResolutionService>(UnitResolutionService);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
    unitsService = module.get<UnitsService>(UnitsService);
    factionsService = module.get<FactionsService>(FactionsService);
  });

  describe("resolve", () => {
    it("should return attacker and defender UnitProfiles when both units are found", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(embeddingsService, "embedTexts").mockResolvedValue([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding")
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([{ id: "u2", name: "Boyz", altNames: [] }]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch")
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce({ id: "u2", name: "Boyz", altNames: [] });
      vi.spyOn(unitsService, "getUnit")
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(defenderUnit);

      const result = await service.resolve(makeCtx());

      expect(result.attackerUnit).toEqual(attackerUnit);
      expect(result.defenderUnit).toEqual(defenderUnit);
    });

    it("should throw when attacker unit cannot be resolved", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(embeddingsService, "embedTexts").mockResolvedValue([
        [0.1],
        [0.2],
      ]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding").mockResolvedValue([]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch").mockReturnValue(
        null,
      );
      vi.spyOn(unitsService, "getUnit").mockResolvedValue(null);

      await expect(service.resolve(makeCtx())).rejects.toThrow(
        'Could not resolve units: attacker="Intercessors", defender="Boyz"',
      );
    });

    it("should throw when defender unit cannot be resolved", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors");

      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(embeddingsService, "embedTexts").mockResolvedValue([
        [0.1],
        [0.2],
      ]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding")
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch")
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce(null);
      vi.spyOn(unitsService, "getUnit")
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(null);

      await expect(service.resolve(makeCtx())).rejects.toThrow(
        'Could not resolve units: attacker="Intercessors", defender="Boyz"',
      );
    });

    it("should include weapon hints in embedding text when hints are present", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      const embedTexts = vi
        .spyOn(embeddingsService, "embedTexts")
        .mockResolvedValue([[0.1], [0.2]]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding")
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([{ id: "u2", name: "Boyz", altNames: [] }]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch")
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce({ id: "u2", name: "Boyz", altNames: [] });
      vi.spyOn(unitsService, "getUnit")
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(defenderUnit);

      await service.resolve(
        makeCtx({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
      );

      expect(embedTexts).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("Bolt Rifle")]),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test unit-resolution.service.spec.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement UnitResolutionService**

Create `apps/backend/src/parse-prompt/unit-resolution.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { UnitsService } from "../units/units.service";
import { FactionsService, FactionRecord } from "../units/factions.service";
import type { UnitProfile } from "../common/types";
import type { ParsedContext } from "./types";

type UnitEmbeddingParams = {
  name: string;
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};

@Injectable()
export class UnitResolutionService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly unitsService: UnitsService,
    private readonly factionsService: FactionsService,
  ) {}

  async resolve(
    ctx: ParsedContext,
  ): Promise<{ attackerUnit: UnitProfile; defenderUnit: UnitProfile }> {
    const factions = await this.factionsService.getAllFactions();
    const getFactionName = (id: string | undefined): string | undefined =>
      id ? factions.find((f) => f.id === id)?.name : undefined;

    const weaponLabel = ctx.phase === "shooting" ? "ranged" : "melee";

    const attackerText = this.buildUnitEmbeddingText({
      name: ctx.attackerName,
      faction: getFactionName(ctx.attackerFactionId),
      ...(weaponLabel === "ranged" && ctx.attackerWeaponHints.length
        ? { rangedWeapons: ctx.attackerWeaponHints.map((h) => h.name) }
        : {}),
      ...(weaponLabel === "melee" && ctx.attackerWeaponHints.length
        ? { meleeWeapons: ctx.attackerWeaponHints.map((h) => h.name) }
        : {}),
    });

    const defenderText = this.buildUnitEmbeddingText({
      name: ctx.defenderName,
      faction: getFactionName(ctx.defenderFactionId),
      ...(weaponLabel === "ranged" && ctx.defenderWeaponHints.length
        ? { rangedWeapons: ctx.defenderWeaponHints.map((h) => h.name) }
        : {}),
      ...(weaponLabel === "melee" && ctx.defenderWeaponHints.length
        ? { meleeWeapons: ctx.defenderWeaponHints.map((h) => h.name) }
        : {}),
    });

    const [attackerEmbedding, defenderEmbedding] =
      await this.embeddingsService.embedTexts([attackerText, defenderText]);

    const [attackerMatches, defenderMatches] = await Promise.all([
      this.unitsService.searchUnitsByEmbedding(
        attackerEmbedding,
        5,
        ctx.attackerFactionId,
      ),
      this.unitsService.searchUnitsByEmbedding(
        defenderEmbedding,
        5,
        ctx.defenderFactionId,
      ),
    ]);

    const attackerBest = this.unitsService.searchUnitsByFuzzyNameMatch(
      ctx.attackerName,
      attackerMatches,
    );
    const defenderBest = this.unitsService.searchUnitsByFuzzyNameMatch(
      ctx.defenderName,
      defenderMatches,
    );

    const [attackerUnit, defenderUnit] = await Promise.all([
      attackerBest ? this.unitsService.getUnit(attackerBest.id) : null,
      defenderBest ? this.unitsService.getUnit(defenderBest.id) : null,
    ]);

    if (!attackerUnit || !defenderUnit) {
      throw new Error(
        `Could not resolve units: attacker="${ctx.attackerName}", defender="${ctx.defenderName}"`,
      );
    }

    return { attackerUnit, defenderUnit };
  }

  private buildUnitEmbeddingText({
    name,
    faction,
    meleeWeapons,
    rangedWeapons,
  }: UnitEmbeddingParams): string {
    const lines = [`Unit: ${name}`];
    if (faction) lines.push(`Faction: ${faction}`);
    if (meleeWeapons?.length)
      lines.push(`Melee weapons: ${meleeWeapons.join(", ")}`);
    if (rangedWeapons?.length)
      lines.push(`Ranged weapons: ${rangedWeapons.join(", ")}`);
    return lines.join("\n");
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test unit-resolution.service.spec.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/parse-prompt/unit-resolution.service.ts apps/backend/src/parse-prompt/unit-resolution.service.spec.ts
git commit -m "feat: add UnitResolutionService"
```

---

## Task 5: WeaponResolutionService

**Files:**

- Create: `apps/backend/src/parse-prompt/weapon-resolution.service.ts`
- Create: `apps/backend/src/parse-prompt/weapon-resolution.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/parse-prompt/weapon-resolution.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { WeaponResolutionService } from "./weapon-resolution.service";
import { LlmService } from "../llm/llm.service";
import type { UnitProfile, WeaponProfile } from "../common/types";
import type { ParsedContext } from "./types";

const makeWeapon = (id: string, name: string): WeaponProfile => ({
  id,
  name,
  attacks: 2,
  skill: 3,
  strength: 4,
  ap: -1,
  damage: 1,
  abilities: [],
});

const makeUnit = (
  id: string,
  name: string,
  shootingWeapons: WeaponProfile[] = [],
  meleeWeapons: WeaponProfile[] = [],
): UnitProfile => ({
  id,
  name,
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons,
  meleeWeapons,
});

const makeCtx = (overrides: Partial<ParsedContext> = {}): ParsedContext => ({
  attackerName: "Intercessors",
  defenderName: "Boyz",
  attackerCount: 5,
  defenderCount: 10,
  phase: "shooting",
  defenderInCover: false,
  firstFighter: "attacker",
  attackerWeaponHints: [{ name: "Bolt Rifle" }],
  defenderWeaponHints: [],
  ...overrides,
});

describe("WeaponResolutionService", () => {
  let service: WeaponResolutionService;
  let llmService: LlmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeaponResolutionService,
        {
          provide: LlmService,
          useValue: { createMessage: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<WeaponResolutionService>(WeaponResolutionService);
    llmService = module.get<LlmService>(LlmService);
  });

  describe("resolve", () => {
    it("should return matched attacker weapon when LLM identifies it by name", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit(
        "u2",
        "Boyz",
        [],
        [makeWeapon("w2", "Choppa")],
      );

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });

    it("should set modelCount when LLM returns a specific number", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: 3 }],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([
        { weaponId: "w1", modelCount: 3 },
      ]);
    });

    it("should fall back to first attacker weapon when LLM returns unrecognized weapon name", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Unknown Weapon", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });

    it("should return first defender melee weapon as default when phase is shooting", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const choppa = makeWeapon("w2", "Choppa");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit("u2", "Boyz", [], [choppa]);

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx({ phase: "shooting" }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should resolve both attacker and defender weapons when phase is melee", async () => {
      const powerSword = makeWeapon("w1", "Power Sword");
      const choppa = makeWeapon("w2", "Choppa");
      const attackerUnit = makeUnit("u1", "Intercessors", [], [powerSword]);
      const defenderUnit = makeUnit("u2", "Boyz", [], [choppa]);

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Power Sword", modelCount: null }],
          defenderWeapons: [{ weaponName: "Choppa", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx({ phase: "melee" }),
        attackerUnit,
        defenderUnit,
        "melee",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should throw when LLM returns no JSON object", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors", [
        makeWeapon("w1", "Bolt Rifle"),
      ]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        "I cannot determine the weapons.",
      );

      await expect(
        service.resolve(makeCtx(), attackerUnit, defenderUnit, "shooting"),
      ).rejects.toThrow("No JSON object found");
    });

    it("should match weapon name case-insensitively and normalize apostrophes", async () => {
      const weapon = makeWeapon("w1", "Guardian’s Spear");
      const attackerUnit = makeUnit("u1", "Custodes", [weapon]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [
            { weaponName: "guardian's spear", modelCount: null },
          ],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test weapon-resolution.service.spec.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement WeaponResolutionService**

Create `apps/backend/src/parse-prompt/weapon-resolution.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import type {
  UnitProfile,
  WeaponProfile,
  SelectedWeapon,
} from "../common/types";
import type { ParsedContext, WeaponResolution } from "./types";

@Injectable()
export class WeaponResolutionService {
  constructor(private readonly llmService: LlmService) {}

  async resolve(
    ctx: ParsedContext,
    attackerUnit: UnitProfile,
    defenderUnit: UnitProfile,
    phase: "shooting" | "melee",
  ): Promise<WeaponResolution> {
    const system = this.buildWeaponSystemPrompt(
      attackerUnit,
      defenderUnit,
      phase,
    );
    const message = [
      ctx.attackerWeaponHints.length > 0
        ? `Attacker weapons mentioned: ${ctx.attackerWeaponHints
            .map((h) => (h.count != null ? `${h.name} (${h.count})` : h.name))
            .join(", ")}`
        : "No specific attacker weapons mentioned.",
      ctx.defenderWeaponHints.length > 0
        ? `Defender weapons mentioned: ${ctx.defenderWeaponHints
            .map((h) => (h.count != null ? `${h.name} (${h.count})` : h.name))
            .join(", ")}`
        : "No specific defender weapons mentioned.",
    ].join("\n");

    const rawText = await this.llmService.createMessage({
      model: "haiku",
      maxTokens: 256,
      system,
      cacheControl: true,
      message,
    });

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      throw new Error(`No JSON object found in LLM response: ${rawText}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error(`LLM returned invalid JSON for weapons: ${jsonMatch[0]}`);
    }

    const attackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const defenderPool = defenderUnit.meleeWeapons;

    return {
      attackerWeapons: this.parseWeaponList(
        parsed.attackerWeapons,
        attackerPool,
        attackerPool[0]?.id,
      ),
      defenderWeapons:
        phase === "melee"
          ? this.parseWeaponList(
              parsed.defenderWeapons,
              defenderPool,
              defenderPool[0]?.id,
            )
          : defenderPool.length > 0
            ? [{ weaponId: defenderPool[0].id }]
            : [],
    };
  }

  private buildWeaponSystemPrompt(
    attackerUnit: UnitProfile,
    defenderUnit: UnitProfile,
    phase: "shooting" | "melee",
  ): string {
    const attackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const attackerNames = attackerPool.map((w) => `  - "${w.name}"`).join("\n");

    const schemaFields =
      phase === "melee"
        ? `  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }],\n  "defenderWeapons": [{ "weaponName": string, "modelCount": number | null }]`
        : `  "attackerWeapons": [{ "weaponName": string, "modelCount": number | null }]`;

    let defenderSection = "";
    if (phase === "melee") {
      const defenderNames = defenderUnit.meleeWeapons
        .map((w) => `  - "${w.name}"`)
        .join("\n");
      defenderSection = `\n\nDefender melee weapons:\n${defenderNames || "  (none)"}`;
    }

    return `You are a Warhammer 40,000 combat assistant. Identify which weapons are used in this combat.

Attacker weapons:
${attackerNames || "  (none)"}${defenderSection}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
${schemaFields}
}

Rules:
- Use weapon names exactly as listed above
- List weapons in the order mentioned by the user
- "modelCount" is null if all models use the weapon, or a specific number if only some do (e.g. 2 of a specific weapon in a 10-model squad)
- If attacker weapons are not clearly specified, default to the first weapon in the list`;
  }

  private normalizeWeaponName(s: string): string {
    return s
      .toLowerCase()
      .replace(/[‘’`’]/g, "’")
      .trim();
  }

  private parseWeaponList(
    raw: unknown,
    pool: WeaponProfile[],
    fallbackId: string | undefined,
  ): SelectedWeapon[] {
    if (Array.isArray(raw) && raw.length > 0) {
      const result: SelectedWeapon[] = raw
        .filter((item) => item && typeof item.weaponName === "string")
        .flatMap((item) => {
          const match = pool.find(
            (w) =>
              this.normalizeWeaponName(w.name) ===
              this.normalizeWeaponName(item.weaponName as string),
          );
          if (!match) return [];
          const modelCount =
            item.modelCount != null && Number.isFinite(Number(item.modelCount))
              ? Math.max(1, Number(item.modelCount))
              : undefined;
          return [{ weaponId: match.id, modelCount }];
        });
      if (result.length > 0) return result;
    }
    return fallbackId ? [{ weaponId: fallbackId }] : [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test weapon-resolution.service.spec.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/parse-prompt/weapon-resolution.service.ts apps/backend/src/parse-prompt/weapon-resolution.service.spec.ts
git commit -m "feat: add WeaponResolutionService"
```

---

## Task 6: ParsePromptService

**Files:**

- Create: `apps/backend/src/parse-prompt/parse-prompt.service.ts`
- Create: `apps/backend/src/parse-prompt/parse-prompt.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/parse-prompt/parse-prompt.service.spec.ts`:

```ts
import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { ParsePromptService } from "./parse-prompt.service";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";
import type { UnitProfile } from "../common/types";
import type { ParsedContext } from "./types";

const makeCtx = (overrides: Partial<ParsedContext> = {}): ParsedContext => ({
  attackerName: "Intercessors",
  defenderName: "Boyz",
  attackerCount: 5,
  defenderCount: 10,
  phase: "shooting",
  defenderInCover: false,
  firstFighter: "attacker",
  attackerWeaponHints: [],
  defenderWeaponHints: [],
  ...overrides,
});

const makeUnit = (id: string, name: string): UnitProfile => ({
  id,
  name,
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [
    {
      id: "w1",
      name: "Bolt Rifle",
      attacks: 2,
      skill: 3,
      strength: 4,
      ap: -1,
      damage: 1,
      abilities: [],
    },
  ],
  meleeWeapons: [
    {
      id: "w2",
      name: "Close Combat Weapon",
      attacks: 3,
      skill: 3,
      strength: 3,
      ap: 0,
      damage: 1,
      abilities: [],
    },
  ],
});

describe("ParsePromptService", () => {
  let service: ParsePromptService;
  let contextExtractionService: ContextExtractionService;
  let unitResolutionService: UnitResolutionService;
  let weaponResolutionService: WeaponResolutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsePromptService,
        {
          provide: ContextExtractionService,
          useValue: { extract: vi.fn() },
        },
        {
          provide: UnitResolutionService,
          useValue: { resolve: vi.fn() },
        },
        {
          provide: WeaponResolutionService,
          useValue: { resolve: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ParsePromptService>(ParsePromptService);
    contextExtractionService = module.get<ContextExtractionService>(
      ContextExtractionService,
    );
    unitResolutionService = module.get<UnitResolutionService>(
      UnitResolutionService,
    );
    weaponResolutionService = module.get<WeaponResolutionService>(
      WeaponResolutionService,
    );
  });

  describe("parse", () => {
    it("should return CombatFormState with default weapons when no weapon hints are present", async () => {
      const ctx = makeCtx();
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });

      const result = await service.parse("5 Intercessors shoot 10 Boyz");

      expect(result).toMatchObject({
        phase: "shooting",
        attackerUnitId: "u1",
        attackerCount: 5,
        attackerWeapons: [{ weaponId: "w1" }],
        defenderUnitId: "u2",
        defenderCount: 10,
        defenderInCover: false,
        defenderWeapons: [{ weaponId: "w2" }],
        firstFighter: "attacker",
      });
    });

    it("should not call WeaponResolutionService when no weapon hints are present", async () => {
      const ctx = makeCtx();
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      const weaponResolve = vi.spyOn(weaponResolutionService, "resolve");

      await service.parse("some prompt");

      expect(weaponResolve).not.toHaveBeenCalled();
    });

    it("should call WeaponResolutionService and use its result when attacker weapon hints are present", async () => {
      const ctx = makeCtx({ attackerWeaponHints: [{ name: "Bolt Rifle" }] });
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      vi.spyOn(weaponResolutionService, "resolve").mockResolvedValue({
        attackerWeapons: [{ weaponId: "w1", modelCount: 3 }],
        defenderWeapons: [{ weaponId: "w2" }],
      });

      const result = await service.parse("some prompt");

      expect(result.attackerWeapons).toEqual([
        { weaponId: "w1", modelCount: 3 },
      ]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should call WeaponResolutionService when only defender weapon hints are present", async () => {
      const ctx = makeCtx({ defenderWeaponHints: [{ name: "Choppa" }] });
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      const weaponResolve = vi
        .spyOn(weaponResolutionService, "resolve")
        .mockResolvedValue({
          attackerWeapons: [{ weaponId: "w1" }],
          defenderWeapons: [{ weaponId: "w2" }],
        });

      await service.parse("some prompt");

      expect(weaponResolve).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test parse-prompt.service.spec.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement ParsePromptService**

Create `apps/backend/src/parse-prompt/parse-prompt.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";
import type { CombatFormState, SelectedWeapon } from "../common/types";
import { DEFAULT_ATTACKER_CONTEXT } from "../common/types";

@Injectable()
export class ParsePromptService {
  constructor(
    private readonly contextExtractionService: ContextExtractionService,
    private readonly unitResolutionService: UnitResolutionService,
    private readonly weaponResolutionService: WeaponResolutionService,
  ) {}

  async parse(prompt: string): Promise<CombatFormState> {
    const ctx = await this.contextExtractionService.extract(prompt);
    const { attackerUnit, defenderUnit } =
      await this.unitResolutionService.resolve(ctx);

    const phase = ctx.phase;
    const defaultAttackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const defaultDefenderPool = defenderUnit.meleeWeapons;

    let attackerWeapons: SelectedWeapon[] =
      defaultAttackerPool.length > 0
        ? [{ weaponId: defaultAttackerPool[0].id }]
        : [];
    let defenderWeapons: SelectedWeapon[] =
      defaultDefenderPool.length > 0
        ? [{ weaponId: defaultDefenderPool[0].id }]
        : [];

    if (
      ctx.attackerWeaponHints.length > 0 ||
      ctx.defenderWeaponHints.length > 0
    ) {
      const weaponResolution = await this.weaponResolutionService.resolve(
        ctx,
        attackerUnit,
        defenderUnit,
        phase,
      );
      attackerWeapons = weaponResolution.attackerWeapons;
      defenderWeapons = weaponResolution.defenderWeapons;
    }

    return {
      phase,
      attackerUnitId: attackerUnit.id,
      attackerCount: ctx.attackerCount,
      attackerWeapons,
      attackerContext: DEFAULT_ATTACKER_CONTEXT,
      defenderUnitId: defenderUnit.id,
      defenderCount: ctx.defenderCount,
      defenderInCover: ctx.defenderInCover,
      defenderWeapons,
      defenderContext: DEFAULT_ATTACKER_CONTEXT,
      firstFighter: ctx.firstFighter,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test parse-prompt.service.spec.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/parse-prompt/parse-prompt.service.ts apps/backend/src/parse-prompt/parse-prompt.service.spec.ts
git commit -m "feat: add ParsePromptService"
```

---

## Task 7: Controller, Module, AppModule wiring

**Files:**

- Create: `apps/backend/src/parse-prompt/parse-prompt.controller.ts`
- Create: `apps/backend/src/parse-prompt/parse-prompt.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create ParsePromptController**

Create `apps/backend/src/parse-prompt/parse-prompt.controller.ts`:

```ts
import { Body, Controller, Post } from "@nestjs/common";
import { ParsePromptService } from "./parse-prompt.service";
import type { CombatFormState } from "../common/types";

@Controller("parse-prompt")
export class ParsePromptController {
  constructor(private readonly parsePromptService: ParsePromptService) {}

  @Post()
  parse(@Body() body: { prompt: string }): Promise<CombatFormState> {
    return this.parsePromptService.parse(body.prompt);
  }
}
```

- [ ] **Step 2: Create ParsePromptModule**

Create `apps/backend/src/parse-prompt/parse-prompt.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { UnitsModule } from "../units/units.module";
import { ParsePromptController } from "./parse-prompt.controller";
import { ParsePromptService } from "./parse-prompt.service";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";

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

- [ ] **Step 3: Wire ParsePromptModule into AppModule**

Replace the contents of `apps/backend/src/app.module.ts` with:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { UnitsModule } from "./units/units.module";
import { ParsePromptModule } from "./parse-prompt/parse-prompt.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    UnitsModule,
    ParsePromptModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Run all tests to verify nothing is broken**

```bash
cd apps/backend && pnpm test
```

Expected: all tests PASS

- [ ] **Step 5: Run typecheck**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/parse-prompt/parse-prompt.controller.ts apps/backend/src/parse-prompt/parse-prompt.module.ts apps/backend/src/app.module.ts apps/backend/src/parse-prompt/types.ts
git commit -m "feat: add ParsePromptModule and wire into AppModule"
```
