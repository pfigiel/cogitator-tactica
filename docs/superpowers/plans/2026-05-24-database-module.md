# Database Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Prisma in the NestJS backend with a singleton `PrismaService` exposed via an importable `DatabaseModule`.

**Architecture:** Copy the Prisma schema and migrations from `apps/web` into `apps/backend/prisma/` — backend becomes the long-term schema owner. `PrismaService` extends `PrismaClient` and handles NestJS lifecycle hooks. `DatabaseModule` is non-global; feature modules import it explicitly. NestJS module caching ensures a single `PrismaService` instance and a single DB connection regardless of how many modules import it.

**Tech Stack:** NestJS 11, Prisma 6.19.3, Vitest 4, `@nestjs/testing`

---

## File Map

| File                                                | Action                      |
| --------------------------------------------------- | --------------------------- |
| `apps/backend/prisma/schema.prisma`                 | Create (copy from web)      |
| `apps/backend/prisma/migrations/`                   | Create (copy from web)      |
| `apps/backend/package.json`                         | Modify — add deps + scripts |
| `apps/backend/src/database/prisma.service.ts`       | Create                      |
| `apps/backend/src/database/prisma.service.spec.ts`  | Create                      |
| `apps/backend/src/database/database.module.ts`      | Create                      |
| `apps/backend/src/database/database.module.spec.ts` | Create                      |
| `apps/backend/README.md`                            | Modify — add DB section     |

---

### Task 1: Copy Prisma schema and migrations to backend

**Files:**

- Create: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/` (directory tree)

- [ ] **Step 1: Copy schema and migrations**

```bash
cp apps/web/prisma/schema.prisma apps/backend/prisma/schema.prisma
cp -r apps/web/prisma/migrations apps/backend/prisma/migrations
```

- [ ] **Step 2: Verify files are in place**

```bash
ls apps/backend/prisma/
```

Expected output includes `schema.prisma` and `migrations/`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/prisma/
git commit -m "chore: copy prisma schema and migrations to backend"
```

---

### Task 2: Add Prisma dependencies and install

**Files:**

- Modify: `apps/backend/package.json`

- [ ] **Step 1: Add dependencies to `apps/backend/package.json`**

In `dependencies`, add:

```json
"@prisma/client": "6.19.3"
```

In `devDependencies`, add:

```json
"prisma": "6.19.3"
```

In `scripts`, add:

```json
"db:generate": "prisma generate",
"db:migrate:deploy": "prisma migrate deploy",
"db:migrate:dev": "prisma migrate dev"
```

- [ ] **Step 2: Install and generate Prisma client**

```bash
pnpm install
cd apps/backend && pnpm db:generate
```

Expected: Prisma client generated to `node_modules/.prisma/client/`. No errors.

- [ ] **Step 3: Verify TypeScript can import Prisma types**

```bash
cd apps/backend && pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml
git commit -m "chore: add prisma dependencies to backend"
```

---

### Task 3: Implement PrismaService (TDD)

**Files:**

- Create: `apps/backend/src/database/prisma.service.spec.ts`
- Create: `apps/backend/src/database/prisma.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/backend/src/database/prisma.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it("should be defined when injected", () => {
    expect(service).toBeDefined();
  });

  it("should call $connect when onModuleInit is called", async () => {
    const connectSpy = vi
      .spyOn(service, "$connect")
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledOnce();
  });

  it("should call $disconnect when onModuleDestroy is called", async () => {
    const disconnectSpy = vi
      .spyOn(service, "$disconnect")
      .mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/backend && pnpm test src/database/prisma.service.spec.ts
```

Expected: FAIL — `Cannot find module './prisma.service'`

- [ ] **Step 3: Implement PrismaService**

Create `apps/backend/src/database/prisma.service.ts`:

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/backend && pnpm test src/database/prisma.service.spec.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/database/prisma.service.ts apps/backend/src/database/prisma.service.spec.ts
git commit -m "feat: add PrismaService"
```

---

### Task 4: Implement DatabaseModule (TDD)

**Files:**

- Create: `apps/backend/src/database/database.module.spec.ts`
- Create: `apps/backend/src/database/database.module.ts`

- [ ] **Step 1: Write failing test**

Create `apps/backend/src/database/database.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "./database.module";
import { PrismaService } from "./prisma.service";

describe("DatabaseModule", () => {
  it("should export PrismaService when imported", async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/backend && pnpm test src/database/database.module.spec.ts
```

Expected: FAIL — `Cannot find module './database.module'`

- [ ] **Step 3: Implement DatabaseModule**

Create `apps/backend/src/database/database.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd apps/backend && pnpm test src/database/database.module.spec.ts
```

Expected: 1 test PASS.

- [ ] **Step 5: Run all backend tests to check for regressions**

```bash
cd apps/backend && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/database/database.module.ts apps/backend/src/database/database.module.spec.ts
git commit -m "feat: add DatabaseModule"
```

---

### Task 5: Update README with database documentation

**Files:**

- Modify: `apps/backend/README.md`

- [ ] **Step 1: Add DB section to `apps/backend/README.md`**

Add after the `## Scripts` section (after the scripts table, before `## Deployment`):

```markdown
## Database

Prisma is used for database access. The schema lives in `prisma/schema.prisma`; this app owns migrations.

### Environment

Requires `DATABASE_URL` set to a PostgreSQL connection string:
```

DATABASE_URL=postgresql://user:password@localhost:5432/cogitator_tactica

```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:migrate:dev --name <name>` | Create and apply a new migration (dev only) |
| `pnpm db:migrate:deploy` | Apply pending migrations (CI/prod) |

### Adding a migration

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:migrate:dev --name describe_your_change`
3. Commit the generated migration file in `prisma/migrations/`
4. Run `pnpm db:generate` if the client is stale in your editor
```

Also update the scripts table to add `db:generate`, `db:migrate:dev`, and `db:migrate:deploy` entries:

```markdown
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:migrate:dev` | Create a new migration (dev only) |
| `pnpm db:migrate:deploy`| Apply pending migrations (CI/prod) |
```

Also update the `Structure` section to include `prisma/`:

```markdown
src/
app.module.ts # Root NestJS module
database/ # DatabaseModule + PrismaService
health/ # Health check module and controller
lambda.ts # Lambda handler
main.ts # Local dev entry point
prisma/
schema.prisma # Prisma schema (backend owns migrations)
migrations/ # Migration history
serverless.yml # Serverless Framework deployment config
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/README.md
git commit -m "docs: add database setup documentation to backend README"
```
