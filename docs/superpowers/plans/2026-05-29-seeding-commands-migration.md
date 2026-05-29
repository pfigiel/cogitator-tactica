# Seeding Commands Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate web seeding scripts to a single `seed` NestJS CLI command using `nest-commander` that parses Wahapedia CSVs, upserts to DB, generates alt names via LLM, and generates vector embeddings.

**Architecture:** `nest-commander`'s `CommandFactory` bootstraps a standalone NestJS app context from `cli.ts`. A `SeedingModule` registers `SeedCommand` and three supporting services (`WahapediaParserService`, `WahapediaUpsertService`, `WahapediaAltNamesService`). A new `UnitEmbeddingsService` lives in `UnitsModule` and handles embedding text construction + vector storage.

**Tech Stack:** nest-commander 3.20.1, NestJS 11, PrismaService, LlmService, EmbeddingsService, vitest, vitest-mock-extended

---

## File Map

| File                                                           | Action        | Responsibility                                                             |
| -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `apps/backend/wahapedia-data/`                                 | Create (copy) | CSV source files                                                           |
| `apps/backend/cli.ts`                                          | Create        | CLI bootstrap entry point                                                  |
| `apps/backend/tsconfig.json`                                   | Modify        | Add `cli.ts` to include                                                    |
| `apps/backend/package.json`                                    | Modify        | Add `nest-commander`, add `seed` script                                    |
| `apps/backend/src/units/unit-embeddings.service.ts`            | Create        | Build embedding text + store vectors via EmbeddingsService + PrismaService |
| `apps/backend/src/units/unit-embeddings.service.spec.ts`       | Create        | Unit tests for UnitEmbeddingsService                                       |
| `apps/backend/src/units/units.module.ts`                       | Modify        | Add EmbeddingsModule import, provide/export UnitEmbeddingsService          |
| `apps/backend/src/seeding/wahapedia-parser.service.ts`         | Create        | CSV parsing, data transformation, ability parsing                          |
| `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`    | Create        | Unit tests for parseAbilities and deriveWeaponId                           |
| `apps/backend/src/seeding/wahapedia-upsert.service.ts`         | Create        | DB upserts via PrismaService                                               |
| `apps/backend/src/seeding/wahapedia-upsert.service.spec.ts`    | Create        | Unit tests for WahapediaUpsertService                                      |
| `apps/backend/src/seeding/wahapedia-alt-names.service.ts`      | Create        | Alt name generation via LlmService + DB update                             |
| `apps/backend/src/seeding/wahapedia-alt-names.service.spec.ts` | Create        | Unit tests for WahapediaAltNamesService                                    |
| `apps/backend/src/seeding/seed.command.ts`                     | Create        | SeedCommand — orchestrates full pipeline                                   |
| `apps/backend/src/seeding/seeding.module.ts`                   | Create        | NestJS module wiring for CLI                                               |

---

### Task 1: Copy wahapedia-data and install nest-commander

**Files:**

- Create: `apps/backend/wahapedia-data/` (directory with CSVs)
- Modify: `apps/backend/package.json`

- [ ] **Step 1: Copy CSV files from web to backend**

```bash
cp -r apps/web/wahapedia-data apps/backend/wahapedia-data
```

Expected: `ls apps/backend/wahapedia-data` shows `Datasheets.csv`, `Factions.csv`, `Datasheets_models.csv`, etc.

- [ ] **Step 2: Install nest-commander with exact version**

```bash
cd apps/backend && npm install nest-commander@3.20.1 --save-exact
```

Expected: `"nest-commander": "3.20.1"` appears in `package.json` dependencies (no `^`).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/wahapedia-data apps/backend/package.json apps/backend/package-lock.json
git commit -m "chore: copy wahapedia-data to backend and add nest-commander"
```

---

### Task 2: UnitEmbeddingsService

**Files:**

- Create: `apps/backend/src/units/unit-embeddings.service.spec.ts`
- Create: `apps/backend/src/units/unit-embeddings.service.ts`
- Modify: `apps/backend/src/units/units.module.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/units/unit-embeddings.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { UnitEmbeddingsService } from "./unit-embeddings.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { PrismaService } from "../database/prisma.service";
import { getMockDbUnitWithWeapons } from "../database/test/mocks";

describe("UnitEmbeddingsService", () => {
  let service: UnitEmbeddingsService;
  let embeddings: DeepMockProxy<EmbeddingsService>;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitEmbeddingsService,
        { provide: EmbeddingsService, useValue: mockDeep<EmbeddingsService>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(UnitEmbeddingsService);
    embeddings = module.get(EmbeddingsService);
    prisma = module.get(PrismaService);
  });

  describe("buildEmbeddingText", () => {
    it("should return only unit name line when only name is provided", () => {
      const result = service.buildEmbeddingText({ name: "Intercessors" });
      expect(result).toBe("Unit: Intercessors");
    });

    it("should include all fields when all params are provided", () => {
      const result = service.buildEmbeddingText({
        name: "Intercessors",
        altNames: ["Intercessor Squad"],
        faction: "Space Marines",
        meleeWeapons: ["Bolt Pistol"],
        rangedWeapons: ["Bolt Rifle"],
      });
      expect(result).toBe(
        "Unit: Intercessors\nAlternative names: Intercessor Squad\nFaction: Space Marines\nMelee weapons: Bolt Pistol\nRanged weapons: Bolt Rifle",
      );
    });

    it("should omit optional fields when arrays are empty", () => {
      const result = service.buildEmbeddingText({
        name: "Intercessors",
        altNames: [],
        meleeWeapons: [],
        rangedWeapons: [],
      });
      expect(result).toBe("Unit: Intercessors");
    });
  });

  describe("generateAndStore", () => {
    it("should call embedTexts with built texts and update each unit when generateAndStore is called", async () => {
      const unit = getMockDbUnitWithWeapons({
        id: "u1",
        name: "Intercessors",
        factionId: "f1",
        altNames: [],
        unitWeapons: [],
      });
      embeddings.embedTexts.mockResolvedValue([[0.1, 0.2]]);
      prisma.$executeRaw.mockResolvedValue(1);

      await service.generateAndStore(
        [unit],
        new Map([["f1", "Space Marines"]]),
      );

      expect(embeddings.embedTexts).toHaveBeenCalledWith([
        "Unit: Intercessors\nFaction: Space Marines",
      ]);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("should process units in two batches when generateAndStore is called with 130 units", async () => {
      const units = Array.from({ length: 130 }, (_, i) =>
        getMockDbUnitWithWeapons({
          id: `u${i}`,
          name: `Unit ${i}`,
          factionId: "f1",
          altNames: [],
          unitWeapons: [],
        }),
      );
      embeddings.embedTexts
        .mockResolvedValueOnce(Array(128).fill([0.1]))
        .mockResolvedValueOnce(Array(2).fill([0.1]));
      prisma.$executeRaw.mockResolvedValue(1);

      await service.generateAndStore(units, new Map([["f1", "Space Marines"]]));

      expect(embeddings.embedTexts).toHaveBeenCalledTimes(2);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(130);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && npm test -- --reporter=verbose unit-embeddings
```

Expected: `Cannot find module './unit-embeddings.service'`

- [ ] **Step 3: Implement UnitEmbeddingsService**

Create `apps/backend/src/units/unit-embeddings.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { DbUnitWithWeapons } from "../database/types";

const BATCH_SIZE = 128;

export type UnitEmbeddingParams = {
  name: string;
  altNames?: string[];
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};

@Injectable()
export class UnitEmbeddingsService {
  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly prisma: PrismaService,
  ) {}

  buildEmbeddingText(params: UnitEmbeddingParams): string {
    const lines = [`Unit: ${params.name}`];
    if (params.altNames?.length)
      lines.push(`Alternative names: ${params.altNames.join(", ")}`);
    if (params.faction) lines.push(`Faction: ${params.faction}`);
    if (params.meleeWeapons?.length)
      lines.push(`Melee weapons: ${params.meleeWeapons.join(", ")}`);
    if (params.rangedWeapons?.length)
      lines.push(`Ranged weapons: ${params.rangedWeapons.join(", ")}`);
    return lines.join("\n");
  }

  async generateAndStore(
    units: DbUnitWithWeapons[],
    factionNameById: Map<string, string>,
  ): Promise<void> {
    for (let i = 0; i < units.length; i += BATCH_SIZE) {
      const batch = units.slice(i, i + BATCH_SIZE);
      const texts = batch.map((u) =>
        this.buildEmbeddingText({
          name: u.name,
          altNames: u.altNames,
          faction: factionNameById.get(u.factionId),
          meleeWeapons: u.unitWeapons
            .filter((uw) => uw.weapon.type === "melee")
            .map((uw) => uw.weapon.name),
          rangedWeapons: u.unitWeapons
            .filter((uw) => uw.weapon.type === "shooting")
            .map((uw) => uw.weapon.name),
        }),
      );

      const embeddingVectors = await this.embeddings.embedTexts(texts);

      for (let j = 0; j < batch.length; j++) {
        const vectorLiteral = Prisma.raw(
          `'[${embeddingVectors[j].join(",")}]'::vector`,
        );
        await this.prisma.$executeRaw`
          UPDATE units SET embedding = ${vectorLiteral} WHERE id = ${batch[j].id}
        `;
      }
    }
  }
}
```

- [ ] **Step 4: Update UnitsModule**

Replace the contents of `apps/backend/src/units/units.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { FactionsService } from "./factions.service";
import { UnitEmbeddingsService } from "./unit-embeddings.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

@Module({
  imports: [DatabaseModule, EmbeddingsModule],
  controllers: [UnitsController],
  providers: [UnitsService, FactionsService, UnitEmbeddingsService],
  exports: [UnitsService, FactionsService, UnitEmbeddingsService],
})
export class UnitsModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/backend && npm test -- --reporter=verbose unit-embeddings
```

Expected: 5 tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/units/unit-embeddings.service.ts apps/backend/src/units/unit-embeddings.service.spec.ts apps/backend/src/units/units.module.ts
git commit -m "feat: add UnitEmbeddingsService to UnitsModule"
```

---

### Task 3: WahapediaParserService

**Files:**

- Create: `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`
- Create: `apps/backend/src/seeding/wahapedia-parser.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/seeding/wahapedia-parser.service.spec.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseAbilities, deriveWeaponId } from "./wahapedia-parser.service";

describe("parseAbilities", () => {
  describe("RAPID FIRE", () => {
    it("should parse numeric value when parseAbilities is called with RAPID FIRE 2", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE 2");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: 2 }]);
    });

    it("should parse D3 when parseAbilities is called with RAPID FIRE D3", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D3" }]);
    });

    it("should parse D6 when parseAbilities is called with RAPID FIRE D6", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D6");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D6" }]);
    });

    it("should parse D6+3 when parseAbilities is called with RAPID FIRE D6+3", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D6+3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D6+3" }]);
    });

    it("should parse D3+1 when parseAbilities is called with RAPID FIRE D3+1", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D3+1");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D3+1" }]);
    });
  });

  describe("SUSTAINED HITS", () => {
    it("should parse numeric value when parseAbilities is called with SUSTAINED HITS 1", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS 1");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: 1 }]);
    });

    it("should parse D3 when parseAbilities is called with SUSTAINED HITS D3", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS D3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D3" }]);
    });

    it("should parse D6 when parseAbilities is called with SUSTAINED HITS D6", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS D6");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D6" }]);
    });

    it("should parse D6+3 when parseAbilities is called with SUSTAINED HITS D6+3", () => {
      const { abilities, unknownTokens } = parseAbilities(
        "SUSTAINED HITS D6+3",
      );
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D6+3" }]);
    });

    it("should parse D3+1 when parseAbilities is called with SUSTAINED HITS D3+1", () => {
      const { abilities, unknownTokens } = parseAbilities(
        "SUSTAINED HITS D3+1",
      );
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D3+1" }]);
    });
  });
});

describe("deriveWeaponId", () => {
  it("should return slug of name for first occurrence when deriveWeaponId is called", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    expect(
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId),
    ).toBe("bolt_rifle");
  });

  it("should return same id when same fingerprint is seen again when deriveWeaponId is called", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp = "ranged|2|3|4|0|1";
    deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId);
    expect(deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId)).toBe(
      "bolt_rifle",
    );
  });

  it("should append 6-char hex hash when same name has different stats when deriveWeaponId is called", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp1 = "ranged|2|3|4|0|1";
    const fp2 = "ranged|2|3|4|1|1";
    const id1 = deriveWeaponId("Bolt Rifle", fp1, slugToFp, fpToId);
    const id2 = deriveWeaponId("Bolt Rifle", fp2, slugToFp, fpToId);
    expect(id1).toBe("bolt_rifle");
    expect(id2).toMatch(/^bolt_rifle_[a-f0-9]{6}$/);
    expect(id1).not.toBe(id2);
  });

  it("should be deterministic when deriveWeaponId is called with same inputs", () => {
    const run = () => {
      const slugToFp = new Map<string, string>();
      const fpToId = new Map<string, string>();
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId);
      return deriveWeaponId("Bolt Rifle", "ranged|2|3|4|1|1", slugToFp, fpToId);
    };
    expect(run()).toBe(run());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && npm test -- --reporter=verbose wahapedia-parser
```

Expected: `Cannot find module './wahapedia-parser.service'`

- [ ] **Step 3: Implement WahapediaParserService**

Create `apps/backend/src/seeding/wahapedia-parser.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  DiceExpression,
  UnitProfile,
  WeaponAbility,
  WeaponProfile,
} from "../common/types";

const DATA_DIR = join(__dirname, "../../wahapedia-data");

// ─── Row types ────────────────────────────────────────────────────────────────

type DatasheetRow = { id: string; name: string; faction_id: string };
type ModelRow = {
  datasheet_id: string;
  line: string;
  name: string;
  T: string;
  Sv: string;
  inv_sv: string;
  W: string;
};
type WargearRow = {
  datasheet_id: string;
  line: string;
  name: string;
  description: string;
  type: string;
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
};
type KeywordRow = { datasheet_id: string; keyword: string };
type FactionRow = { id: string; name: string };

type ParsedData = {
  datasheets: DatasheetRow[];
  models: ModelRow[];
  wargear: WargearRow[];
  keywords: KeywordRow[];
  factions: FactionRow[];
};

export type UnitWithFaction = UnitProfile & { factionId: string };

export type WeaponWarning = {
  unitName: string;
  weaponName: string;
  message: string;
};

export type TransformResult = {
  units: UnitWithFaction[];
  warnings: WeaponWarning[];
  factions: Array<{ id: string; name: string }>;
};

// ─── Ability parsing ──────────────────────────────────────────────────────────

const ABILITY_MAP: Record<string, WeaponAbility> = {
  ASSAULT: { type: "ASSAULT" },
  BLAST: { type: "BLAST" },
  BUBBLECHUKKA: { type: "BUBBLECHUKKA" },
  CONVERSION: { type: "CONVERSION" },
  "C'TAN POWER": { type: "CTAN_POWER" },
  "DEAD CHOPPY": { type: "DEAD_CHOPPY" },
  "DEVASTATING WOUNDS": { type: "DEVASTATING_WOUNDS" },
  "EXTRA ATTACKS": { type: "EXTRA_ATTACKS" },
  HARPOONED: { type: "HARPOONED" },
  HAZARDOUS: { type: "HAZARDOUS" },
  HEAVY: { type: "HEAVY" },
  HOOKED: { type: "HOOKED" },
  "IGNORES COVER": { type: "IGNORES_COVER" },
  IMPALED: { type: "IMPALED" },
  "INDIRECT FIRE": { type: "INDIRECT_FIRE" },
  LANCE: { type: "LANCE" },
  "LETHAL HITS": { type: "LETHAL_HITS" },
  "LINKED FIRE": { type: "LINKED_FIRE" },
  "ONE SHOT": { type: "ONE_SHOT" },
  OVERCHARGE: { type: "OVERCHARGE" },
  PISTOL: { type: "PISTOL" },
  "PLASMA WARHEAD": { type: "PLASMA_WARHEAD" },
  PRECISION: { type: "PRECISION" },
  PSYCHIC: { type: "PSYCHIC" },
  "PSYCHIC ASSASSIN": { type: "PSYCHIC_ASSASSIN" },
  "REVERBERATING SUMMONS": { type: "REVERBERATING_SUMMONS" },
  SNAGGED: { type: "SNAGGED" },
  TORRENT: { type: "TORRENT" },
  "TWIN-LINKED": { type: "TWIN_LINKED" },
};

type ParameterizedParser = {
  re: RegExp;
  parse: (match: RegExpMatchArray) => WeaponAbility;
};

const PARAMETERIZED: ParameterizedParser[] = [
  {
    re: /^ANTI-(.+?)\s+(\d+)\+$/i,
    parse: (m) => ({
      type: "ANTI",
      keyword: m[1].toUpperCase(),
      threshold: parseInt(m[2], 10),
    }),
  },
  {
    re: /^MELTA\s+(\d+)$/i,
    parse: (m) => ({ type: "MELTA", value: parseInt(m[1], 10) }),
  },
  {
    re: /^RAPID FIRE\s+(\d+|(?:\d+)?D(?:3|6)(?:[+-]\d+)?)$/i,
    parse: (m) => {
      const raw = m[1].toUpperCase();
      return {
        type: "RAPID_FIRE",
        value: /^\d+$/.test(raw) ? parseInt(raw, 10) : (raw as DiceExpression),
      };
    },
  },
  {
    re: /^SUSTAINED HITS\s+(\d+|(?:\d+)?D(?:3|6)(?:[+-]\d+)?)$/i,
    parse: (m) => {
      const raw = m[1].toUpperCase();
      return {
        type: "SUSTAINED_HITS",
        value: /^\d+$/.test(raw) ? parseInt(raw, 10) : (raw as DiceExpression),
      };
    },
  },
];

export type ParseAbilitiesResult = {
  abilities: WeaponAbility[];
  unknownTokens: string[];
};

export const parseAbilities = (description: string): ParseAbilitiesResult => {
  if (!description.trim()) return { abilities: [], unknownTokens: [] };

  const abilities: WeaponAbility[] = [];
  const unknownTokens: string[] = [];

  for (const token of description
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)) {
    if (ABILITY_MAP[token]) {
      abilities.push(ABILITY_MAP[token]);
      continue;
    }

    let matched = false;
    for (const { re, parse } of PARAMETERIZED) {
      const m = token.match(re);
      if (m) {
        abilities.push(parse(m));
        matched = true;
        break;
      }
    }
    if (!matched) unknownTokens.push(token);
  }

  return { abilities, unknownTokens };
};

// ─── Weapon ID derivation ─────────────────────────────────────────────────────

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const deriveWeaponId = (
  name: string,
  fingerprint: string,
  slugToFp: Map<string, string>,
  fpToId: Map<string, string>,
): string => {
  if (fpToId.has(fingerprint)) return fpToId.get(fingerprint)!;

  const base = slugify(name);
  let id: string;

  if (!slugToFp.has(base)) {
    slugToFp.set(base, fingerprint);
    id = base;
  } else if (slugToFp.get(base) === fingerprint) {
    id = base;
  } else {
    const hash = createHash("sha256")
      .update(fingerprint)
      .digest("hex")
      .slice(0, 6);
    id = `${base}_${hash}`;
  }

  fpToId.set(fingerprint, id);
  return id;
};

// ─── CSV parsing ──────────────────────────────────────────────────────────────

const parseCsv = (content: string): Record<string, string>[] => {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()]),
    );
  });
};

// ─── Field parsing helpers ────────────────────────────────────────────────────

const parseSave = (raw: string): number => parseInt(raw.replace("+", ""), 10);

const parseInvuln = (raw: string): number | undefined => {
  const t = raw.trim();
  if (!t || t === "-") return undefined;
  return parseInt(t.replace("+", ""), 10);
};

const parseSkill = (raw: string): number => {
  const t = raw.trim();
  if (t === "N/A" || t === "-" || t === "") return 0;
  return parseInt(t.replace("+", ""), 10);
};

const DICE_EXPR_RE = /^(\d+)?D(3|6)([+-]\d+)?$/i;

const parseDiceExpression = (raw: string): DiceExpression | null => {
  const t = raw.trim();
  if (t === "-" || t === "") return null;
  const asNum = Number(t);
  if (!isNaN(asNum)) return asNum;
  if (DICE_EXPR_RE.test(t)) return t.toUpperCase() as DiceExpression;
  return null;
};

const weaponFingerprint = (
  name: string,
  type: string,
  attacks: DiceExpression,
  skill: number,
  strength: DiceExpression,
  ap: number,
  damage: DiceExpression,
): string => `${name}|${type}|${attacks}|${skill}|${strength}|${ap}|${damage}`;

const buildWeapon = (
  row: WargearRow,
  unitName: string,
  warnings: WeaponWarning[],
): Omit<WeaponProfile, "id"> | null => {
  const attacks = parseDiceExpression(row.A);
  if (attacks === null) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid attacks value "${row.A}" — weapon skipped`,
    });
    return null;
  }

  const damage = parseDiceExpression(row.D);
  if (damage === null) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid damage value "${row.D}" — weapon skipped`,
    });
    return null;
  }

  const strength = parseDiceExpression(row.S);
  if (strength === null) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid strength value "${row.S}" — weapon skipped`,
    });
    return null;
  }

  const apRaw = parseInt(row.AP, 10);
  if (isNaN(apRaw)) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `invalid AP value "${row.AP}" — weapon skipped`,
    });
    return null;
  }

  const { abilities, unknownTokens } = parseAbilities(row.description);
  for (const token of unknownTokens) {
    warnings.push({
      unitName,
      weaponName: row.name,
      message: `unrecognized ability token "${token}"`,
    });
  }

  return {
    name: row.name,
    attacks,
    skill: parseSkill(row.BS_WS),
    strength,
    ap: -apRaw,
    damage,
    abilities,
  };
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WahapediaParserService {
  async parseAndTransform(): Promise<TransformResult> {
    const data = await this.parseAll();
    return this.transform(data);
  }

  private async parseAll(): Promise<ParsedData> {
    const readCsv = async (
      filename: string,
    ): Promise<Record<string, string>[]> => {
      const content = await readFile(join(DATA_DIR, filename), "utf-8");
      return parseCsv(content);
    };

    const [dsRaw, modRaw, wgRaw, kwRaw, facRaw] = await Promise.all([
      readCsv("Datasheets.csv"),
      readCsv("Datasheets_models.csv"),
      readCsv("Datasheets_wargear.csv"),
      readCsv("Datasheets_keywords.csv"),
      readCsv("Factions.csv"),
    ]);

    return {
      datasheets: dsRaw.map((r) => ({
        id: r["id"],
        name: r["name"],
        faction_id: r["faction_id"],
      })),
      models: modRaw.map((r) => ({
        datasheet_id: r["datasheet_id"],
        line: r["line"],
        name: r["name"],
        T: r["T"],
        Sv: r["Sv"],
        inv_sv: r["inv_sv"],
        W: r["W"],
      })),
      wargear: wgRaw.map((r) => ({
        datasheet_id: r["datasheet_id"],
        line: r["line"],
        name: r["name"],
        description: r["description"],
        type: r["type"],
        A: r["A"],
        BS_WS: r["BS_WS"],
        S: r["S"],
        AP: r["AP"],
        D: r["D"],
      })),
      keywords: kwRaw.map((r) => ({
        datasheet_id: r["datasheet_id"],
        keyword: r["keyword"],
      })),
      factions: facRaw.map((r) => ({ id: r["id"], name: r["name"] })),
    };
  }

  private transform(data: ParsedData): TransformResult {
    const units: UnitWithFaction[] = [];
    const warnings: WeaponWarning[] = [];
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();

    const modelsBySheet = new Map<string, ModelRow[]>();
    for (const row of data.models) {
      const list = modelsBySheet.get(row.datasheet_id) ?? [];
      list.push(row);
      modelsBySheet.set(row.datasheet_id, list);
    }

    const wargearBySheet = new Map<string, WargearRow[]>();
    for (const row of data.wargear) {
      const list = wargearBySheet.get(row.datasheet_id) ?? [];
      list.push(row);
      wargearBySheet.set(row.datasheet_id, list);
    }

    const keywordsBySheet = new Map<string, string[]>();
    for (const row of data.keywords) {
      const list = keywordsBySheet.get(row.datasheet_id) ?? [];
      list.push(row.keyword.toUpperCase());
      keywordsBySheet.set(row.datasheet_id, list);
    }

    for (const sheet of data.datasheets) {
      const modelLines = modelsBySheet.get(sheet.id) ?? [];
      if (modelLines.length === 0) continue;

      const wargearRows = wargearBySheet.get(sheet.id) ?? [];
      const keywords = keywordsBySheet.get(sheet.id) ?? [];

      for (let i = 0; i < modelLines.length; ++i) {
        const modelLine = modelLines[i];
        const unitName =
          i === 0
            ? sheet.name
            : `${sheet.name} ${modelLine.name
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase())}`;

        const shootingWeapons: WeaponProfile[] = [];
        const meleeWeapons: WeaponProfile[] = [];

        for (const wgRow of wargearRows) {
          const weaponData = buildWeapon(wgRow, unitName, warnings);
          if (!weaponData) continue;

          const wtype =
            wgRow.type.toLowerCase() === "ranged" ? "shooting" : "melee";
          const fp = weaponFingerprint(
            weaponData.name,
            wtype,
            weaponData.attacks,
            weaponData.skill,
            weaponData.strength,
            weaponData.ap,
            weaponData.damage,
          );
          const id = deriveWeaponId(weaponData.name, fp, slugToFp, fpToId);
          const weapon: WeaponProfile = { id, ...weaponData };
          if (wtype === "shooting") shootingWeapons.push(weapon);
          else meleeWeapons.push(weapon);
        }

        const invuln = parseInvuln(modelLine.inv_sv);
        units.push({
          id: slugify(unitName),
          name: unitName,
          toughness: parseInt(modelLine.T, 10),
          save: parseSave(modelLine.Sv),
          ...(invuln !== undefined && { invuln }),
          wounds: parseInt(modelLine.W, 10),
          keywords,
          shootingWeapons,
          meleeWeapons,
          factionId: sheet.faction_id,
        });
      }
    }

    const usedFactionIds = new Set(units.map((u) => u.factionId));
    const factions = data.factions
      .filter((f) => usedFactionIds.has(f.id))
      .map((f) => ({ id: f.id, name: f.name }));

    return { units, warnings, factions };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && npm test -- --reporter=verbose wahapedia-parser
```

Expected: 14 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-parser.service.ts apps/backend/src/seeding/wahapedia-parser.service.spec.ts
git commit -m "feat: add WahapediaParserService"
```

---

### Task 4: WahapediaUpsertService

**Files:**

- Create: `apps/backend/src/seeding/wahapedia-upsert.service.spec.ts`
- Create: `apps/backend/src/seeding/wahapedia-upsert.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/seeding/wahapedia-upsert.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";
import { PrismaService } from "../database/prisma.service";
import type { UnitWithFaction } from "./wahapedia-parser.service";

const makeUnit = (
  overrides: Partial<UnitWithFaction> = {},
): UnitWithFaction => ({
  id: "intercessors",
  name: "Intercessors",
  factionId: "SM",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["INFANTRY"],
  shootingWeapons: [],
  meleeWeapons: [],
  ...overrides,
});

describe("WahapediaUpsertService", () => {
  let service: WahapediaUpsertService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahapediaUpsertService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(WahapediaUpsertService);
    prisma = module.get(PrismaService);
  });

  it("should call prisma.$transaction when upsertAll is called", async () => {
    prisma.$transaction.mockResolvedValue(undefined);

    await service.upsertAll(
      [makeUnit()],
      [{ id: "SM", name: "Space Marines" }],
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("should upsert factions, weapons, and units within transaction when upsertAll is called with a unit with a weapon", async () => {
    prisma.$transaction.mockImplementation(async (fn) =>
      (fn as (tx: typeof prisma) => Promise<void>)(prisma),
    );
    prisma.faction.upsert.mockResolvedValue({} as any);
    prisma.weapon.upsert.mockResolvedValue({} as any);
    prisma.unit.upsert.mockResolvedValue({} as any);
    prisma.unitWeapon.deleteMany.mockResolvedValue({ count: 0 });
    prisma.unitWeapon.createMany.mockResolvedValue({ count: 1 });

    const unit = makeUnit({
      shootingWeapons: [
        {
          id: "bolt_rifle",
          name: "Bolt Rifle",
          attacks: 2,
          skill: 3,
          strength: 4,
          ap: 0,
          damage: 1,
          abilities: [],
        },
      ],
    });

    await service.upsertAll([unit], [{ id: "SM", name: "Space Marines" }]);

    expect(prisma.faction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "SM" } }),
    );
    expect(prisma.weapon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bolt_rifle" } }),
    );
    expect(prisma.unit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "intercessors" } }),
    );
    expect(prisma.unitWeapon.createMany).toHaveBeenCalledWith({
      data: [{ unitId: "intercessors", weaponId: "bolt_rifle" }],
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && npm test -- --reporter=verbose wahapedia-upsert
```

Expected: `Cannot find module './wahapedia-upsert.service'`

- [ ] **Step 3: Implement WahapediaUpsertService**

Create `apps/backend/src/seeding/wahapedia-upsert.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { WeaponType } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { UnitWithFaction } from "./wahapedia-parser.service";

@Injectable()
export class WahapediaUpsertService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertAll(
    units: UnitWithFaction[],
    factions: Array<{ id: string; name: string }>,
  ): Promise<void> {
    const weaponMap = new Map<
      string,
      { weapon: UnitWithFaction["shootingWeapons"][0]; wtype: WeaponType }
    >();
    for (const unit of units) {
      for (const w of unit.shootingWeapons) {
        weaponMap.set(w.id, { weapon: w, wtype: WeaponType.shooting });
      }
      for (const w of unit.meleeWeapons) {
        weaponMap.set(w.id, { weapon: w, wtype: WeaponType.melee });
      }
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (const faction of factions) {
          await tx.faction.upsert({
            where: { id: faction.id },
            update: { name: faction.name },
            create: { id: faction.id, name: faction.name },
          });
        }

        for (const { weapon, wtype } of weaponMap.values()) {
          await tx.weapon.upsert({
            where: { id: weapon.id },
            update: {
              name: weapon.name,
              type: wtype,
              attacks: String(weapon.attacks),
              skill: weapon.skill,
              strength: String(weapon.strength),
              ap: weapon.ap,
              damage: String(weapon.damage),
              abilities: weapon.abilities as object[],
            },
            create: {
              id: weapon.id,
              name: weapon.name,
              type: wtype,
              attacks: String(weapon.attacks),
              skill: weapon.skill,
              strength: String(weapon.strength),
              ap: weapon.ap,
              damage: String(weapon.damage),
              abilities: weapon.abilities as object[],
            },
          });
        }

        for (const unit of units) {
          await tx.unit.upsert({
            where: { id: unit.id },
            update: {
              name: unit.name,
              factionId: unit.factionId,
              toughness: unit.toughness,
              save: unit.save,
              invuln: unit.invuln ?? null,
              wounds: unit.wounds,
              keywords: unit.keywords,
            },
            create: {
              id: unit.id,
              name: unit.name,
              factionId: unit.factionId,
              toughness: unit.toughness,
              save: unit.save,
              invuln: unit.invuln ?? null,
              wounds: unit.wounds,
              keywords: unit.keywords,
            },
          });

          await tx.unitWeapon.deleteMany({ where: { unitId: unit.id } });
          const allWeaponIds = [
            ...unit.shootingWeapons.map((w) => w.id),
            ...unit.meleeWeapons.map((w) => w.id),
          ];
          if (allWeaponIds.length > 0) {
            await tx.unitWeapon.createMany({
              data: allWeaponIds.map((weaponId) => ({
                unitId: unit.id,
                weaponId,
              })),
            });
          }
        }
      },
      { timeout: 1_800_000 },
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && npm test -- --reporter=verbose wahapedia-upsert
```

Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-upsert.service.ts apps/backend/src/seeding/wahapedia-upsert.service.spec.ts
git commit -m "feat: add WahapediaUpsertService"
```

---

### Task 5: WahapediaAltNamesService

**Files:**

- Create: `apps/backend/src/seeding/wahapedia-alt-names.service.spec.ts`
- Create: `apps/backend/src/seeding/wahapedia-alt-names.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/seeding/wahapedia-alt-names.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { WahapediaAltNamesService } from "./wahapedia-alt-names.service";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../database/prisma.service";

describe("WahapediaAltNamesService", () => {
  let service: WahapediaAltNamesService;
  let llm: DeepMockProxy<LlmService>;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahapediaAltNamesService,
        { provide: LlmService, useValue: mockDeep<LlmService>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(WahapediaAltNamesService);
    llm = module.get(LlmService);
    prisma = module.get(PrismaService);
  });

  it("should call LlmService with faction name and update alt names in DB when generateAndUpdate is called", async () => {
    llm.createMessage.mockResolvedValue(
      '{"intercessors": ["Intercessor Squad"]}',
    );
    prisma.unit.update.mockResolvedValue({} as any);

    await service.generateAndUpdate(
      new Map([["SM", [{ id: "intercessors", name: "Intercessors" }]]]),
      new Map([["SM", "Space Marines"]]),
    );

    expect(llm.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "haiku",
        maxTokens: 2048,
        message: expect.stringContaining("Space Marines"),
      }),
    );
    expect(prisma.unit.update).toHaveBeenCalledWith({
      where: { id: "intercessors" },
      data: { altNames: ["Intercessor Squad"] },
    });
  });

  it("should continue processing remaining factions when LLM call fails for one faction when generateAndUpdate is called", async () => {
    llm.createMessage
      .mockRejectedValueOnce(new Error("LLM error"))
      .mockResolvedValueOnce('{"orks_boy": ["Boyz"]}');
    prisma.unit.update.mockResolvedValue({} as any);

    await service.generateAndUpdate(
      new Map([
        ["SM", [{ id: "intercessors", name: "Intercessors" }]],
        ["ORK", [{ id: "orks_boy", name: "Orks Boy" }]],
      ]),
      new Map([
        ["SM", "Space Marines"],
        ["ORK", "Orks"],
      ]),
    );

    expect(llm.createMessage).toHaveBeenCalledTimes(2);
    expect(prisma.unit.update).toHaveBeenCalledTimes(1);
    expect(prisma.unit.update).toHaveBeenCalledWith({
      where: { id: "orks_boy" },
      data: { altNames: ["Boyz"] },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && npm test -- --reporter=verbose wahapedia-alt-names
```

Expected: `Cannot find module './wahapedia-alt-names.service'`

- [ ] **Step 3: Implement WahapediaAltNamesService**

Create `apps/backend/src/seeding/wahapedia-alt-names.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../database/prisma.service";

const CHUNK_SIZE = 30;
const MAX_CONCURRENT = 4;

const SYSTEM_PROMPT = `You are generating alternative names for Warhammer 40,000 units.
For each unit, generate up to 3 alternative names that players commonly use to refer to that unit.
Return ONLY a valid JSON object where each key is the unit ID and the value is a string array of alt names, or an empty array if no good alt name exists.

Guidelines:
1. Pluralize + drop "Squad"/"Team"/"Mob": "Intercessor Squad" → ["Intercessors"], "Devastator Squad" → ["Devastators"]
2. Shorten long compound names by dropping prepositions: "Assault Intercessors With Jump Packs" → ["Jump Intercessors", "Assault Intercessors"]
3. Add or remove faction qualifier: "Intercessor Squad" → ["Space Marine Intercessors"]
4. Named characters: use first name, last name, or common title ("Marneus Calgar" → ["Marneus", "Calgar"]). Return [] for single-word names with no natural shortening ("Azrael" → []).

Fewer alt names is fine when not all strategies apply. Do not invent names players would not recognise.`;

@Injectable()
export class WahapediaAltNamesService {
  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAndUpdate(
    unitsByFaction: Map<string, { id: string; name: string }[]>,
    factionNameById: Map<string, string>,
  ): Promise<void> {
    for (const [factionId, factionUnits] of unitsByFaction) {
      const factionName = factionNameById.get(factionId) ?? factionId;
      console.log(
        `Generating alt names for ${factionName} (${factionUnits.length} units)...`,
      );

      const altNames = await this.generateForFaction(factionUnits, factionName);

      for (const { id, altNames: names } of altNames) {
        await this.prisma.unit.update({
          where: { id },
          data: { altNames: names },
        });
      }
    }
  }

  private async generateForFaction(
    units: { id: string; name: string }[],
    factionName: string,
  ): Promise<{ id: string; altNames: string[] }[]> {
    const chunks: { id: string; name: string }[][] = [];
    for (let i = 0; i < units.length; i += CHUNK_SIZE) {
      chunks.push(units.slice(i, i + CHUNK_SIZE));
    }

    const chunkResults: { [unitId: string]: string[] }[] = [];
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          try {
            const text = await this.llm.createMessage({
              model: "haiku",
              maxTokens: 2048,
              system: SYSTEM_PROMPT,
              message: `Faction: ${factionName}\n\n${JSON.stringify(chunk)}`,
            });
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error(`No JSON in LLM response: ${text}`);
            return JSON.parse(jsonMatch[0]) as { [unitId: string]: string[] };
          } catch (err) {
            console.warn(
              `[WARN] LLM call failed for chunk of ${chunk.length} units in faction ${factionName}: ${err}`,
            );
            return {} as { [unitId: string]: string[] };
          }
        }),
      );
      chunkResults.push(...batchResults);
    }

    const merged: { [unitId: string]: string[] } = Object.assign(
      {},
      ...chunkResults,
    );

    return units
      .filter((unit) => {
        if (!(unit.id in merged)) {
          console.warn(
            `[WARN] Alt names not returned by LLM for unit: ${unit.id} (${unit.name})`,
          );
          return false;
        }
        return true;
      })
      .map((unit) => ({ id: unit.id, altNames: merged[unit.id] }));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && npm test -- --reporter=verbose wahapedia-alt-names
```

Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/seeding/wahapedia-alt-names.service.ts apps/backend/src/seeding/wahapedia-alt-names.service.spec.ts
git commit -m "feat: add WahapediaAltNamesService"
```

---

### Task 6: SeedingModule and SeedCommand

**Files:**

- Create: `apps/backend/src/seeding/seed.command.ts`
- Create: `apps/backend/src/seeding/seeding.module.ts`

- [ ] **Step 1: Implement SeedCommand**

Create `apps/backend/src/seeding/seed.command.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { PrismaService } from "../database/prisma.service";
import { UnitEmbeddingsService } from "../units/unit-embeddings.service";
import { WahapediaAltNamesService } from "./wahapedia-alt-names.service";
import { WahapediaParserService } from "./wahapedia-parser.service";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";

@Injectable()
@Command({
  name: "seed",
  description: "Seed DB with Wahapedia data and generate embeddings",
})
export class SeedCommand extends CommandRunner {
  constructor(
    private readonly parser: WahapediaParserService,
    private readonly upsert: WahapediaUpsertService,
    private readonly altNames: WahapediaAltNamesService,
    private readonly unitEmbeddings: UnitEmbeddingsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(): Promise<void> {
    const { units, factions, warnings } = await this.parser.parseAndTransform();

    for (const w of warnings) {
      console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
    }

    console.log(
      `Upserting ${units.length} units across ${factions.length} factions...`,
    );
    await this.upsert.upsertAll(units, factions);
    console.log("Units upserted.");

    const factionNameById = new Map(factions.map((f) => [f.id, f.name]));
    const unitsByFaction = new Map<string, { id: string; name: string }[]>();
    for (const unit of units) {
      const list = unitsByFaction.get(unit.factionId) ?? [];
      list.push({ id: unit.id, name: unit.name });
      unitsByFaction.set(unit.factionId, list);
    }

    await this.altNames.generateAndUpdate(unitsByFaction, factionNameById);
    console.log("Alt names generated.");

    const dbUnits = await this.prisma.unit.findMany({
      include: { unitWeapons: { include: { weapon: true } } },
    });
    console.log(`Generating embeddings for ${dbUnits.length} units...`);
    await this.unitEmbeddings.generateAndStore(dbUnits, factionNameById);
    console.log("Embeddings generated. Done.");
  }
}
```

- [ ] **Step 2: Implement SeedingModule**

Create `apps/backend/src/seeding/seeding.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LlmModule } from "../llm/llm.module";
import { UnitsModule } from "../units/units.module";
import { SeedCommand } from "./seed.command";
import { WahapediaAltNamesService } from "./wahapedia-alt-names.service";
import { WahapediaParserService } from "./wahapedia-parser.service";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";

@Module({
  imports: [DatabaseModule, LlmModule, UnitsModule],
  providers: [
    SeedCommand,
    WahapediaParserService,
    WahapediaUpsertService,
    WahapediaAltNamesService,
  ],
})
export class SeedingModule {}
```

- [ ] **Step 3: Run typecheck to verify no type errors**

```bash
cd apps/backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/seeding/seed.command.ts apps/backend/src/seeding/seeding.module.ts
git commit -m "feat: add SeedCommand and SeedingModule"
```

---

### Task 7: CLI entry point and npm script

**Files:**

- Create: `apps/backend/cli.ts`
- Modify: `apps/backend/tsconfig.json`
- Modify: `apps/backend/package.json`

- [ ] **Step 1: Create cli.ts**

Create `apps/backend/cli.ts`:

```typescript
import { CommandFactory } from "nest-commander";
import { SeedingModule } from "./src/seeding/seeding.module";

async function bootstrap() {
  await CommandFactory.run(SeedingModule, { logger: ["warn", "error"] });
}

bootstrap();
```

- [ ] **Step 2: Add cli.ts to tsconfig include**

In `apps/backend/tsconfig.json`, update the `include` array to add `"cli.ts"`:

```json
"include": ["src/**/*.ts", "main.ts", "lambda.ts", "cli.ts"]
```

- [ ] **Step 3: Add seed script to package.json**

In `apps/backend/package.json`, add `"seed"` to the `"scripts"` object:

```json
"seed": "ts-node cli.ts seed"
```

- [ ] **Step 4: Run typecheck to verify cli.ts type-checks cleanly**

```bash
cd apps/backend && npm run typecheck
```

Expected: no errors

- [ ] **Step 5: Verify CLI help works**

```bash
cd apps/backend && npx ts-node cli.ts --help
```

Expected: output includes `seed` command listing

- [ ] **Step 6: Commit**

```bash
git add apps/backend/cli.ts apps/backend/tsconfig.json apps/backend/package.json
git commit -m "feat: add CLI entry point and seed npm script"
```

---

### Task 8: Full test suite verification

- [ ] **Step 1: Run all backend tests**

```bash
cd apps/backend && npm test
```

Expected: all existing tests plus new tests pass, no failures

- [ ] **Step 2: Run typecheck one final time**

```bash
cd apps/backend && npm run typecheck
```

Expected: no errors
