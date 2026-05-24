# Units Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a NestJS `UnitsModule` in `apps/backend` that owns unit and faction data access, migrating logic from `apps/web/src/lib/db/`.

**Architecture:** `UnitsModule` imports `DatabaseModule` for `PrismaService` and exports `UnitsService` and `FactionsService` for use by other modules. DB payload types live in `apps/backend/src/database/types.ts`. Mappers and search logic are private to `UnitsService`.

**Tech Stack:** NestJS 11, Prisma 6, fuse.js 7.3.0, Vitest 4

---

## File Map

| Action | Path                                              | Responsibility                                                                                    |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Create | `apps/backend/src/database/types.ts`              | Prisma payload types (`DbUnit`, `DbWeapon`, `DbUnitWithWeapons`)                                  |
| Create | `apps/backend/src/units/factions.service.ts`      | `getAllFactions()`, `FactionRecord` type                                                          |
| Create | `apps/backend/src/units/factions.service.spec.ts` | Factions service tests                                                                            |
| Create | `apps/backend/src/units/units.service.ts`         | `listUnits`, `getUnit`, `searchUnitsByEmbedding`, `searchUnitsByFuzzyNameMatch` + private mappers |
| Create | `apps/backend/src/units/units.service.spec.ts`    | Units service tests                                                                               |
| Create | `apps/backend/src/units/units.controller.ts`      | `GET /units`, `GET /units/:id`                                                                    |
| Create | `apps/backend/src/units/units.controller.spec.ts` | Controller tests                                                                                  |
| Create | `apps/backend/src/units/units.module.ts`          | Wires services, controller, imports DatabaseModule                                                |
| Modify | `apps/backend/src/app.module.ts`                  | Add `UnitsModule` to imports                                                                      |
| Modify | `apps/backend/package.json`                       | Add `fuse.js` dependency                                                                          |

---

## Task 1: Add DB Payload Types to DatabaseModule

**Files:**

- Create: `apps/backend/src/database/types.ts`

These are Prisma payload types shared across feature services. No tests needed — type-only file verified by `tsc`.

- [ ] **Step 1: Create the types file**

```typescript
// apps/backend/src/database/types.ts
import { Prisma } from "@prisma/client";

export type DbUnit = Prisma.UnitGetPayload<Record<string, never>>;
export type DbWeapon = Prisma.WeaponGetPayload<Record<string, never>>;
export type DbUnitWithWeapons = Prisma.UnitGetPayload<{
  include: { unitWeapons: { include: { weapon: true } } };
}>;
```

- [ ] **Step 2: Run typecheck to verify**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/database/types.ts
git commit -m "feat: add Prisma payload types to database module"
```

---

## Task 2: Add fuse.js Dependency

**Files:**

- Modify: `apps/backend/package.json`

- [ ] **Step 1: Add fuse.js to backend dependencies**

In `apps/backend/package.json`, add to the `"dependencies"` object (alphabetical order, exact version — no `^` or `~`):

```json
"fuse.js": "7.3.0",
```

- [ ] **Step 2: Install**

```bash
pnpm install
```

Expected: lockfile updated, `fuse.js` present in `apps/backend/node_modules`

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "feat: add fuse.js dependency to backend"
```

---

## Task 3: FactionsService

**Files:**

- Create: `apps/backend/src/units/factions.service.spec.ts`
- Create: `apps/backend/src/units/factions.service.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/units/factions.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { FactionsService } from "./factions.service";
import { PrismaService } from "../database/prisma.service";

describe("FactionsService", () => {
  let service: FactionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactionsService,
        {
          provide: PrismaService,
          useValue: { faction: { findMany: vi.fn() } },
        },
      ],
    }).compile();

    service = module.get<FactionsService>(FactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should return faction records when getAllFactions is called", async () => {
    const factions = [
      { id: "f1", name: "Space Marines" },
      { id: "f2", name: "Orks" },
    ];
    vi.spyOn(prisma.faction, "findMany").mockResolvedValue(factions as never);

    const result = await service.getAllFactions();

    expect(result).toEqual(factions);
    expect(prisma.faction.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd apps/backend && pnpm vitest run src/units/factions.service.spec.ts
```

Expected: FAIL — `Cannot find module './factions.service'`

- [ ] **Step 3: Implement FactionsService**

```typescript
// apps/backend/src/units/factions.service.ts
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

- [ ] **Step 4: Run to verify it passes**

```bash
cd apps/backend && pnpm vitest run src/units/factions.service.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/units/factions.service.ts apps/backend/src/units/factions.service.spec.ts
git commit -m "feat: add FactionsService"
```

---

## Task 4: UnitsService

**Files:**

- Create: `apps/backend/src/units/units.service.spec.ts`
- Create: `apps/backend/src/units/units.service.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/backend/src/units/units.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { UnitsService } from "./units.service";
import { PrismaService } from "../database/prisma.service";

const makeDbUnit = (overrides = {}) => ({
  id: "unit-1",
  name: "Intercessors",
  toughness: 4,
  save: 3,
  invuln: null,
  wounds: 2,
  keywords: ["Infantry"],
  factionId: "f1",
  altNames: [],
  unitWeapons: [],
  ...overrides,
});

describe("UnitsService", () => {
  let service: UnitsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        {
          provide: PrismaService,
          useValue: {
            unit: { findMany: vi.fn(), findUnique: vi.fn() },
            $queryRaw: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe("listUnits", () => {
    it("should return id and name array when listUnits is called", async () => {
      const units = [
        { id: "unit-1", name: "Intercessors" },
        { id: "unit-2", name: "Tactical Marines" },
      ];
      vi.spyOn(prisma.unit, "findMany").mockResolvedValue(units as never);

      const result = await service.listUnits();

      expect(result).toEqual(units);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("getUnit", () => {
    it("should return UnitProfile when unit exists", async () => {
      const db = makeDbUnit({
        unitWeapons: [
          {
            weapon: {
              id: "w1",
              name: "Bolt Rifle",
              type: "shooting",
              attacks: "1",
              skill: 3,
              strength: "4",
              ap: -1,
              damage: "1",
              abilities: [],
            },
          },
        ] as never,
      });
      vi.spyOn(prisma.unit, "findUnique").mockResolvedValue(db as never);

      const result = await service.getUnit("unit-1");

      expect(result).toMatchObject({
        id: "unit-1",
        name: "Intercessors",
        toughness: 4,
        save: 3,
        wounds: 2,
        keywords: ["Infantry"],
        shootingWeapons: [{ id: "w1", name: "Bolt Rifle" }],
        meleeWeapons: [],
      });
      expect(prisma.unit.findUnique).toHaveBeenCalledWith({
        where: { id: "unit-1" },
        include: { unitWeapons: { include: { weapon: true } } },
      });
    });

    it("should return null when unit does not exist", async () => {
      vi.spyOn(prisma.unit, "findUnique").mockResolvedValue(null);

      const result = await service.getUnit("missing");

      expect(result).toBeNull();
    });
  });

  describe("searchUnitsByEmbedding", () => {
    it("should return query results when searchUnitsByEmbedding is called", async () => {
      const expected = [{ id: "unit-1", name: "Intercessors", altNames: [] }];
      vi.spyOn(prisma, "$queryRaw").mockResolvedValue(expected);

      const result = await service.searchUnitsByEmbedding([0.1, 0.2, 0.3]);

      expect(result).toEqual(expected);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("should include faction filter when factionId is provided", async () => {
      vi.spyOn(prisma, "$queryRaw").mockResolvedValue([]);

      await service.searchUnitsByEmbedding([0.1, 0.2], 5, "faction-1");

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe("searchUnitsByFuzzyNameMatch", () => {
    it("should return best matching candidate when unitName matches", () => {
      const candidates = [
        { id: "u1", name: "Intercessors", altNames: [] },
        { id: "u2", name: "Terminators", altNames: [] },
      ];

      const result = service.searchUnitsByFuzzyNameMatch(
        "Intercessor",
        candidates,
      );

      expect(result?.id).toBe("u1");
    });

    it("should return null when candidates list is empty", () => {
      const result = service.searchUnitsByFuzzyNameMatch("anything", []);

      expect(result).toBeNull();
    });

    it("should match on alt names when primary name does not match", () => {
      const candidates = [
        { id: "u1", name: "Intercessors", altNames: ["Bolter Boys"] },
      ];

      const result = service.searchUnitsByFuzzyNameMatch(
        "Bolter Boys",
        candidates,
      );

      expect(result?.id).toBe("u1");
    });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd apps/backend && pnpm vitest run src/units/units.service.spec.ts
```

Expected: FAIL — `Cannot find module './units.service'`

- [ ] **Step 3: Implement UnitsService**

```typescript
// apps/backend/src/units/units.service.ts
import { Injectable } from "@nestjs/common";
import Fuse from "fuse.js";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { DbUnitWithWeapons, DbWeapon } from "../database/types";
import type {
  UnitProfile,
  WeaponProfile,
  DiceExpression,
  WeaponAbility,
} from "../common/types";

export type UnitSearchResult = { id: string; name: string; altNames: string[] };

const parseDiceExpr = (s: string): DiceExpression => {
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
};

const toWeaponProfile = (db: DbWeapon): WeaponProfile => ({
  id: db.id,
  name: db.name,
  attacks: parseDiceExpr(db.attacks),
  skill: db.skill,
  strength: parseDiceExpr(db.strength),
  ap: db.ap,
  damage: parseDiceExpr(db.damage),
  abilities: db.abilities as WeaponAbility[],
});

const toUnitProfile = (db: DbUnitWithWeapons): UnitProfile => ({
  id: db.id,
  name: db.name,
  toughness: db.toughness,
  save: db.save,
  ...(db.invuln !== null && { invuln: db.invuln }),
  wounds: db.wounds,
  keywords: db.keywords,
  shootingWeapons: db.unitWeapons
    .filter((uw) => uw.weapon.type === "shooting")
    .map((uw) => toWeaponProfile(uw.weapon)),
  meleeWeapons: db.unitWeapons
    .filter((uw) => uw.weapon.type === "melee")
    .map((uw) => toWeaponProfile(uw.weapon)),
});

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  listUnits(): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.unit.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async getUnit(id: string): Promise<UnitProfile | null> {
    const db = await this.prisma.unit.findUnique({
      where: { id },
      include: { unitWeapons: { include: { weapon: true } } },
    });
    return db ? toUnitProfile(db) : null;
  }

  searchUnitsByEmbedding(
    embedding: number[],
    limit = 5,
    factionId?: string,
  ): Promise<UnitSearchResult[]> {
    const vectorLiteral = Prisma.raw(`'[${embedding.join(",")}]'::vector`);
    const factionFilter = factionId
      ? Prisma.sql`AND faction_id = ${factionId}`
      : Prisma.empty;
    return this.prisma.$queryRaw<UnitSearchResult[]>`
      SELECT id, name, alt_names AS "altNames"
      FROM units
      WHERE embedding IS NOT NULL ${factionFilter}
      ORDER BY embedding <=> ${vectorLiteral}
      LIMIT ${limit}
    `;
  }

  searchUnitsByFuzzyNameMatch(
    unitName: string,
    candidates: UnitSearchResult[],
  ): UnitSearchResult | null {
    if (candidates.length === 0) return null;

    type Doc = { unitId: string; term: string };
    const docs: Doc[] = candidates.flatMap((u) => [
      { unitId: u.id, term: u.name },
      ...u.altNames.map((alt) => ({ unitId: u.id, term: alt })),
    ]);

    const fuse = new Fuse(docs, {
      keys: ["term"],
      includeScore: true,
      threshold: 1.0,
    });

    const results = fuse.search(unitName);
    if (results.length === 0) return candidates[0];

    const best = results.reduce((a, b) =>
      (a.score ?? 1) <= (b.score ?? 1) ? a : b,
    );

    return candidates.find((u) => u.id === best.item.unitId) ?? candidates[0];
  }
}
```

- [ ] **Step 4: Run to verify they pass**

```bash
cd apps/backend && pnpm vitest run src/units/units.service.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/units/units.service.ts apps/backend/src/units/units.service.spec.ts
git commit -m "feat: add UnitsService"
```

---

## Task 5: UnitsController

**Files:**

- Create: `apps/backend/src/units/units.controller.spec.ts`
- Create: `apps/backend/src/units/units.controller.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/backend/src/units/units.controller.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { vi } from "vitest";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";
import type { UnitProfile } from "../common/types";

const makeUnitProfile = (
  overrides: Partial<UnitProfile> = {},
): UnitProfile => ({
  id: "unit-1",
  name: "Intercessors",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["Infantry"],
  shootingWeapons: [],
  meleeWeapons: [],
  ...overrides,
});

describe("UnitsController", () => {
  let controller: UnitsController;
  let unitsService: UnitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [
        {
          provide: UnitsService,
          useValue: {
            listUnits: vi.fn(),
            getUnit: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UnitsController>(UnitsController);
    unitsService = module.get<UnitsService>(UnitsService);
  });

  describe("listUnits", () => {
    it("should return units array when GET /units is called", async () => {
      const units = [{ id: "unit-1", name: "Intercessors" }];
      vi.spyOn(unitsService, "listUnits").mockResolvedValue(units);

      const result = await controller.listUnits();

      expect(result).toEqual(units);
    });
  });

  describe("getUnit", () => {
    it("should return UnitProfile when unit exists", async () => {
      const profile = makeUnitProfile();
      vi.spyOn(unitsService, "getUnit").mockResolvedValue(profile);

      const result = await controller.getUnit("unit-1");

      expect(result).toEqual(profile);
      expect(unitsService.getUnit).toHaveBeenCalledWith("unit-1");
    });

    it("should throw NotFoundException when unit does not exist", async () => {
      vi.spyOn(unitsService, "getUnit").mockResolvedValue(null);

      await expect(controller.getUnit("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd apps/backend && pnpm vitest run src/units/units.controller.spec.ts
```

Expected: FAIL — `Cannot find module './units.controller'`

- [ ] **Step 3: Implement UnitsController**

```typescript
// apps/backend/src/units/units.controller.ts
import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { UnitsService } from "./units.service";
import type { UnitProfile } from "../common/types";

@Controller("units")
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  listUnits(): Promise<Array<{ id: string; name: string }>> {
    return this.unitsService.listUnits();
  }

  @Get(":id")
  async getUnit(@Param("id") id: string): Promise<UnitProfile> {
    const unit = await this.unitsService.getUnit(id);
    if (!unit) throw new NotFoundException();
    return unit;
  }
}
```

- [ ] **Step 4: Run to verify they pass**

```bash
cd apps/backend && pnpm vitest run src/units/units.controller.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/units/units.controller.ts apps/backend/src/units/units.controller.spec.ts
git commit -m "feat: add UnitsController"
```

---

## Task 6: UnitsModule and AppModule Wiring

**Files:**

- Create: `apps/backend/src/units/units.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create UnitsModule**

```typescript
// apps/backend/src/units/units.module.ts
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { FactionsService } from "./factions.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

@Module({
  imports: [DatabaseModule],
  controllers: [UnitsController],
  providers: [UnitsService, FactionsService],
  exports: [UnitsService, FactionsService],
})
export class UnitsModule {}
```

- [ ] **Step 2: Add UnitsModule to AppModule**

```typescript
// apps/backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { UnitsModule } from "./units/units.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    UnitsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Run all backend tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests PASS

- [ ] **Step 4: Run typecheck**

```bash
cd apps/backend && pnpm typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/units/units.module.ts apps/backend/src/app.module.ts
git commit -m "feat: wire UnitsModule into AppModule"
```
