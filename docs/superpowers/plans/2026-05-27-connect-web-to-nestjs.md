# Connect Web App to NestJS Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all API calls in `apps/web` with direct browser fetches to the NestJS backend, using React Query for data fetching.

**Architecture:** Browser calls NestJS backend directly at `NEXT_PUBLIC_BACKEND_URL`. A new `src/api/` layer mirrors the centile-grid pattern: raw fetch functions in `endpoints/`, React Query hooks in `hooks/`, MSW handlers for tests in `tests/handlers/`.

**Tech Stack:** `@tanstack/react-query`, `msw` (v2), `@testing-library/react`, `jsdom`, vitest

---

## File Map

### New files

| File                                                                                      | Purpose                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/web/src/api/endpoints/getUnits/getUnits.ts`                                         | `GET /units` fetch fn                      |
| `apps/web/src/api/endpoints/getUnits/getUnits.test.ts`                                    | endpoint unit test                         |
| `apps/web/src/api/endpoints/getUnits/index.ts`                                            | barrel                                     |
| `apps/web/src/api/endpoints/getUnit/getUnit.ts`                                           | `GET /units/:id` fetch fn                  |
| `apps/web/src/api/endpoints/getUnit/getUnit.test.ts`                                      | endpoint unit test                         |
| `apps/web/src/api/endpoints/getUnit/index.ts`                                             | barrel                                     |
| `apps/web/src/api/endpoints/parsePrompt/parsePrompt.ts`                                   | `POST /parse-prompt` fetch fn              |
| `apps/web/src/api/endpoints/parsePrompt/parsePrompt.test.ts`                              | endpoint unit test                         |
| `apps/web/src/api/endpoints/parsePrompt/index.ts`                                         | barrel                                     |
| `apps/web/src/api/endpoints/calculate/calculate.ts`                                       | `POST /calculate` fetch fn                 |
| `apps/web/src/api/endpoints/calculate/calculate.test.ts`                                  | endpoint unit test                         |
| `apps/web/src/api/endpoints/calculate/index.ts`                                           | barrel                                     |
| `apps/web/src/api/tests/handlers/units.ts`                                                | MSW handlers for units routes              |
| `apps/web/src/api/tests/handlers/parsePrompt.ts`                                          | MSW handlers for parse-prompt route        |
| `apps/web/src/api/tests/handlers/calculate.ts`                                            | MSW handlers for calculate route           |
| `apps/web/src/api/tests/handlers/index.ts`                                                | handlers barrel                            |
| `apps/web/src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.ts`                     | React Query hook                           |
| `apps/web/src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.test.tsx`               | hook test                                  |
| `apps/web/src/api/hooks/queries/useGetUnitsQuery/index.ts`                                | barrel                                     |
| `apps/web/src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.ts`                       | React Query hook                           |
| `apps/web/src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.test.tsx`                 | hook test                                  |
| `apps/web/src/api/hooks/queries/useGetUnitQuery/index.ts`                                 | barrel                                     |
| `apps/web/src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.ts`       | React Query mutation                       |
| `apps/web/src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.test.tsx` | mutation test                              |
| `apps/web/src/api/hooks/mutations/useParsePromptMutation/index.ts`                        | barrel                                     |
| `apps/web/src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.ts`           | React Query mutation                       |
| `apps/web/src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.test.tsx`     | mutation test                              |
| `apps/web/src/api/hooks/mutations/useCalculateMutation/index.ts`                          | barrel                                     |
| `apps/web/src/api/index.ts`                                                               | `api` object barrel                        |
| `apps/web/src/test/providers/TestQueryClientProvider.tsx`                                 | test wrapper                               |
| `apps/web/src/app/providers.tsx`                                                          | `"use client"` QueryClientProvider wrapper |

### Modified files

| File                                                                      | Change                                                                |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/web/package.json`                                                   | add `@tanstack/react-query`, `msw`, `@testing-library/react`, `jsdom` |
| `apps/web/vitest.config.ts`                                               | add `test.env.NEXT_PUBLIC_BACKEND_URL`                                |
| `apps/web/.env.example`                                                   | add `NEXT_PUBLIC_BACKEND_URL`                                         |
| `apps/backend/main.ts`                                                    | add `app.enableCors()`                                                |
| `apps/web/src/app/layout.tsx`                                             | wrap children with `<Providers>`                                      |
| `apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx`   | replace fetch with query hooks                                        |
| `apps/web/src/features/calculator/components/PromptInput/PromptInput.tsx` | replace fetch with mutation                                           |
| `apps/web/src/app/calculator/results/page.tsx`                            | replace fetch + `calculate()` with mutation                           |

---

## Task 1: Install deps, configure env, enable CORS

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/vitest.config.ts`
- Modify: `apps/web/.env.example`
- Modify: `apps/backend/main.ts`

- [ ] **Step 1: Install deps in web app**

```bash
pnpm --filter @cogitator-tactica/web add @tanstack/react-query
pnpm --filter @cogitator-tactica/web add -D @testing-library/react jsdom
```

Then in `apps/web/package.json` devDependencies, add msw from the workspace catalog:

```json
"msw": "catalog:test"
```

Run `pnpm install` from repo root to apply.

- [ ] **Step 2: Add test env var to vitest config**

Full replacement of `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      NEXT_PUBLIC_BACKEND_URL: "http://localhost:3001",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add env var to .env.example**

Add to `apps/web/.env.example`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

- [ ] **Step 4: Enable CORS on the backend**

Replace `apps/backend/main.ts`:

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./src/app.module";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT ?? 3001);
};

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/.env.example apps/backend/main.ts pnpm-lock.yaml
git commit -m "chore: add react-query, msw, testing-library; enable CORS on backend"
```

---

## Task 2: TestQueryClientProvider + Providers wrapper

**Files:**

- Create: `apps/web/src/test/providers/TestQueryClientProvider.tsx`
- Create: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create TestQueryClientProvider**

```tsx
// apps/web/src/test/providers/TestQueryClientProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

type Props = { children: ReactNode };

export const TestQueryClientProvider = ({ children }: Props) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      })
    }
  >
    {children}
  </QueryClientProvider>
);
```

- [ ] **Step 2: Create Providers client component**

```tsx
// apps/web/src/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

type Props = { children: ReactNode };

export const Providers = ({ children }: Props) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
```

- [ ] **Step 3: Wrap layout with Providers**

Replace `apps/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "@cogitator-tactica/ui-kit/styles.css";
import { ColorSchemeScript, UIProvider } from "@cogitator-tactica/ui-kit";
import styles from "./layout.module.css";
import { ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Cogitator Tactica",
  description: "Warhammer 40,000 statistics battle calculator",
};

type Props = {
  children: ReactNode;
};

const RootLayout = ({ children }: Props) => (
  <html lang="en" suppressHydrationWarning>
    <head>
      <ColorSchemeScript defaultColorScheme="dark" />
    </head>
    <body className={styles.body}>
      <Providers>
        <UIProvider defaultColorScheme="dark">
          <header className={styles.header}>
            <span className={styles.appName}>Cogitator Tactica</span>
            {" · "}
            <span className={styles.appDesc}>
              Statistics Calculator — Warhammer 40,000 10th Edition
            </span>
          </header>
          {children}
        </UIProvider>
      </Providers>
    </body>
  </html>
);

export default RootLayout;
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/test/providers/TestQueryClientProvider.tsx apps/web/src/app/providers.tsx apps/web/src/app/layout.tsx
git commit -m "feat: add QueryClientProvider to layout"
```

---

## Task 3: getUnits endpoint

**Files:**

- Create: `apps/web/src/api/tests/handlers/units.ts`
- Create: `apps/web/src/api/endpoints/getUnits/getUnits.ts`
- Create: `apps/web/src/api/endpoints/getUnits/getUnits.test.ts`
- Create: `apps/web/src/api/endpoints/getUnits/index.ts`

- [ ] **Step 1: Create MSW handler for units**

```ts
// apps/web/src/api/tests/handlers/units.ts
import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export const units = {
  getUnits: {
    success: (overrides?: { data?: Array<{ id: string; name: string }> }) =>
      http.get(`${BASE}/units`, () => HttpResponse.json(overrides?.data ?? [])),
    error: (overrides?: { status?: number }) =>
      http.get(
        `${BASE}/units`,
        () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
      ),
  },
  getUnit: {
    success: (overrides?: { id?: string; data?: object }) =>
      http.get(`${BASE}/units/:id`, ({ params }) =>
        HttpResponse.json(overrides?.data ?? { id: params.id, name: "Unit" }),
      ),
    error: (overrides?: { status?: number }) =>
      http.get(
        `${BASE}/units/:id`,
        () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
      ),
  },
};
```

- [ ] **Step 2: Write failing test**

```ts
// apps/web/src/api/endpoints/getUnits/getUnits.test.ts
import { setupServer } from "msw/node";
import { units } from "../../tests/handlers/units";
import { getUnits } from "./getUnits";

const server = setupServer(
  units.getUnits.success({ data: [{ id: "1", name: "Intercessors" }] }),
);

describe("getUnits", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return units list when response is ok", async () => {
    const result = await getUnits();
    expect(result).toEqual([{ id: "1", name: "Intercessors" }]);
  });

  it("should throw when response is not ok", async () => {
    server.use(units.getUnits.error());
    await expect(getUnits()).rejects.toThrow("Failed to fetch units");
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/getUnits/getUnits.test.ts
```

Expected: FAIL — `getUnits` not defined.

- [ ] **Step 4: Implement getUnits**

```ts
// apps/web/src/api/endpoints/getUnits/getUnits.ts
export const getUnits = async (): Promise<
  Array<{ id: string; name: string }>
> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/units`);
  if (!response.ok) throw new Error("Failed to fetch units");
  return response.json() as Promise<Array<{ id: string; name: string }>>;
};
```

```ts
// apps/web/src/api/endpoints/getUnits/index.ts
export { getUnits } from "./getUnits";
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/getUnits/getUnits.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/
git commit -m "feat: add getUnits endpoint with MSW handler"
```

---

## Task 4: getUnit endpoint

**Files:**

- Modify: `apps/web/src/api/tests/handlers/units.ts` (already includes `getUnit` handler from Task 3)
- Create: `apps/web/src/api/endpoints/getUnit/getUnit.ts`
- Create: `apps/web/src/api/endpoints/getUnit/getUnit.test.ts`
- Create: `apps/web/src/api/endpoints/getUnit/index.ts`

- [ ] **Step 1: Write failing test**

```ts
// apps/web/src/api/endpoints/getUnit/getUnit.test.ts
import { setupServer } from "msw/node";
import { units } from "../../tests/handlers/units";
import { getUnit } from "./getUnit";
import type { UnitProfile } from "@/lib/calculator/types";

const mockUnit: UnitProfile = {
  id: "unit-1",
  name: "Intercessors",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["INFANTRY"],
  shootingWeapons: [],
  meleeWeapons: [],
};

const server = setupServer(units.getUnit.success({ data: mockUnit }));

describe("getUnit", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return unit profile when response is ok", async () => {
    const result = await getUnit("unit-1");
    expect(result).toEqual(mockUnit);
  });

  it("should throw when response is not ok", async () => {
    server.use(units.getUnit.error());
    await expect(getUnit("unit-1")).rejects.toThrow("Failed to fetch unit");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/getUnit/getUnit.test.ts
```

Expected: FAIL — `getUnit` not defined.

- [ ] **Step 3: Implement getUnit**

```ts
// apps/web/src/api/endpoints/getUnit/getUnit.ts
import type { UnitProfile } from "@/lib/calculator/types";

export const getUnit = async (id: string): Promise<UnitProfile> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/units/${id}`);
  if (!response.ok) throw new Error("Failed to fetch unit");
  return response.json() as Promise<UnitProfile>;
};
```

```ts
// apps/web/src/api/endpoints/getUnit/index.ts
export { getUnit } from "./getUnit";
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/getUnit/getUnit.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/
git commit -m "feat: add getUnit endpoint"
```

---

## Task 5: parsePrompt endpoint

**Files:**

- Create: `apps/web/src/api/tests/handlers/parsePrompt.ts`
- Create: `apps/web/src/api/endpoints/parsePrompt/parsePrompt.ts`
- Create: `apps/web/src/api/endpoints/parsePrompt/parsePrompt.test.ts`
- Create: `apps/web/src/api/endpoints/parsePrompt/index.ts`

- [ ] **Step 1: Create MSW handler for parse-prompt**

```ts
// apps/web/src/api/tests/handlers/parsePrompt.ts
import { http, HttpResponse } from "msw";
import type { CombatFormState } from "@/lib/calculator/types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export const parsePrompt = {
  success: (overrides?: { data?: Partial<CombatFormState> }) =>
    http.post(`${BASE}/parse-prompt`, () =>
      HttpResponse.json(overrides?.data ?? {}),
    ),
  error: (overrides?: { status?: number }) =>
    http.post(
      `${BASE}/parse-prompt`,
      () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
    ),
};
```

- [ ] **Step 2: Write failing test**

```ts
// apps/web/src/api/endpoints/parsePrompt/parsePrompt.test.ts
import { setupServer } from "msw/node";
import { parsePrompt as parsePromptHandler } from "../../tests/handlers/parsePrompt";
import { parsePrompt } from "./parsePrompt";
import type { CombatFormState } from "@/lib/calculator/types";

const mockState: Partial<CombatFormState> = {
  phase: "shooting",
  attackerUnitId: "unit-1",
  defenderUnitId: "unit-2",
};

const server = setupServer(parsePromptHandler.success({ data: mockState }));

describe("parsePrompt", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return parsed form state when response is ok", async () => {
    const result = await parsePrompt("10 intercessors shoot at ork boyz");
    expect(result).toEqual(mockState);
  });

  it("should throw when response is not ok", async () => {
    server.use(parsePromptHandler.error());
    await expect(parsePrompt("some prompt")).rejects.toThrow(
      "Failed to parse prompt",
    );
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/parsePrompt/parsePrompt.test.ts
```

Expected: FAIL — `parsePrompt` not defined.

- [ ] **Step 4: Implement parsePrompt**

```ts
// apps/web/src/api/endpoints/parsePrompt/parsePrompt.ts
import type { CombatFormState } from "@/lib/calculator/types";

export const parsePrompt = async (prompt: string): Promise<CombatFormState> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/parse-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error("Failed to parse prompt");
  return response.json() as Promise<CombatFormState>;
};
```

```ts
// apps/web/src/api/endpoints/parsePrompt/index.ts
export { parsePrompt } from "./parsePrompt";
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/parsePrompt/parsePrompt.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/
git commit -m "feat: add parsePrompt endpoint"
```

---

## Task 6: calculate endpoint

**Files:**

- Create: `apps/web/src/api/tests/handlers/calculate.ts`
- Create: `apps/web/src/api/endpoints/calculate/calculate.ts`
- Create: `apps/web/src/api/endpoints/calculate/calculate.test.ts`
- Create: `apps/web/src/api/endpoints/calculate/index.ts`

- [ ] **Step 1: Create MSW handler for calculate**

```ts
// apps/web/src/api/tests/handlers/calculate.ts
import { http, HttpResponse } from "msw";
import type { CombatResult } from "@/lib/calculator/types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export const calculate = {
  success: (overrides?: { data?: Partial<CombatResult> }) =>
    http.post(`${BASE}/calculate`, () =>
      HttpResponse.json(overrides?.data ?? {}),
    ),
  error: (overrides?: { status?: number }) =>
    http.post(
      `${BASE}/calculate`,
      () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
    ),
};
```

- [ ] **Step 2: Write failing test**

```ts
// apps/web/src/api/endpoints/calculate/calculate.test.ts
import { setupServer } from "msw/node";
import { calculate as calculateHandler } from "../../tests/handlers/calculate";
import { calculate } from "./calculate";
import type { CombatInput, CombatResult } from "@/lib/calculator/types";

const mockInput: CombatInput = {
  phase: "shooting",
  attacker: {
    unit: {
      id: "unit-1",
      name: "Intercessors",
      toughness: 4,
      save: 3,
      wounds: 2,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 10,
    selectedWeapons: [],
  },
  defender: {
    unit: {
      id: "unit-2",
      name: "Ork Boyz",
      toughness: 4,
      save: 6,
      wounds: 1,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 20,
    selectedWeapons: [],
  },
};

const mockResult: Partial<CombatResult> = {
  phase: "shooting",
  primary: {
    attackerName: "Intercessors (10)",
    defenderName: "Ork Boyz",
    weaponResults: [],
    totalAverageDamage: 5,
    totalAverageModelsSlain: 5,
  },
};

const server = setupServer(calculateHandler.success({ data: mockResult }));

describe("calculate", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return combat result when response is ok", async () => {
    const result = await calculate(mockInput);
    expect(result).toEqual(mockResult);
  });

  it("should throw when response is not ok", async () => {
    server.use(calculateHandler.error());
    await expect(calculate(mockInput)).rejects.toThrow("Failed to calculate");
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/calculate/calculate.test.ts
```

Expected: FAIL — `calculate` not defined.

- [ ] **Step 4: Implement calculate**

```ts
// apps/web/src/api/endpoints/calculate/calculate.ts
import type { CombatInput, CombatResult } from "@/lib/calculator/types";

export const calculate = async (input: CombatInput): Promise<CombatResult> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to calculate");
  return response.json() as Promise<CombatResult>;
};
```

```ts
// apps/web/src/api/endpoints/calculate/index.ts
export { calculate } from "./calculate";
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/endpoints/calculate/calculate.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/
git commit -m "feat: add calculate endpoint"
```

---

## Task 7: api/index.ts and handlers barrel

**Files:**

- Create: `apps/web/src/api/tests/handlers/index.ts`
- Create: `apps/web/src/api/index.ts`

- [ ] **Step 1: Create handlers barrel**

```ts
// apps/web/src/api/tests/handlers/index.ts
import { units } from "./units";
import { parsePrompt } from "./parsePrompt";
import { calculate } from "./calculate";

export const handlers = { units, parsePrompt, calculate };
```

- [ ] **Step 2: Create api barrel**

```ts
// apps/web/src/api/index.ts
import { getUnits } from "./endpoints/getUnits";
import { getUnit } from "./endpoints/getUnit";
import { parsePrompt } from "./endpoints/parsePrompt";
import { calculate } from "./endpoints/calculate";

export const api = {
  getUnits,
  getUnit,
  parsePrompt,
  calculate,
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/index.ts apps/web/src/api/tests/handlers/index.ts
git commit -m "feat: add api barrel and handlers index"
```

---

## Task 8: useGetUnitsQuery hook

**Files:**

- Create: `apps/web/src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.ts`
- Create: `apps/web/src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.test.tsx`
- Create: `apps/web/src/api/hooks/queries/useGetUnitsQuery/index.ts`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.test.tsx
// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useGetUnitsQuery } from "./useGetUnitsQuery";

const mockUnits = [{ id: "1", name: "Intercessors" }];
const server = setupServer(
  handlers.units.getUnits.success({ data: mockUnits }),
);

describe("useGetUnitsQuery", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return units list when fetch succeeds", async () => {
    const { result } = renderHook(() => useGetUnitsQuery(), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUnits);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.test.tsx
```

Expected: FAIL — `useGetUnitsQuery` not defined.

- [ ] **Step 3: Implement useGetUnitsQuery**

```ts
// apps/web/src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";

export const useGetUnitsQuery = () =>
  useQuery({
    queryKey: ["units"],
    queryFn: api.getUnits,
  });
```

```ts
// apps/web/src/api/hooks/queries/useGetUnitsQuery/index.ts
export { useGetUnitsQuery } from "./useGetUnitsQuery";
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/queries/useGetUnitsQuery/useGetUnitsQuery.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/hooks/
git commit -m "feat: add useGetUnitsQuery hook"
```

---

## Task 9: useGetUnitQuery hook

**Files:**

- Create: `apps/web/src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.ts`
- Create: `apps/web/src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.test.tsx`
- Create: `apps/web/src/api/hooks/queries/useGetUnitQuery/index.ts`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.test.tsx
// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useGetUnitQuery } from "./useGetUnitQuery";
import type { UnitProfile } from "@/lib/calculator/types";

const mockUnit: UnitProfile = {
  id: "unit-1",
  name: "Intercessors",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
};

const server = setupServer(handlers.units.getUnit.success({ data: mockUnit }));

describe("useGetUnitQuery", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return unit profile when fetch succeeds", async () => {
    const { result } = renderHook(() => useGetUnitQuery("unit-1"), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUnit);
  });

  it("should not fetch when id is empty", () => {
    const { result } = renderHook(() => useGetUnitQuery(""), {
      wrapper: TestQueryClientProvider,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.test.tsx
```

Expected: FAIL — `useGetUnitQuery` not defined.

- [ ] **Step 3: Implement useGetUnitQuery**

```ts
// apps/web/src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type { UnitProfile } from "@/lib/calculator/types";

export const useGetUnitQuery = (id: string) =>
  useQuery<UnitProfile>({
    queryKey: ["unit", id],
    queryFn: () => api.getUnit(id),
    enabled: !!id,
  });
```

```ts
// apps/web/src/api/hooks/queries/useGetUnitQuery/index.ts
export { useGetUnitQuery } from "./useGetUnitQuery";
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/queries/useGetUnitQuery/useGetUnitQuery.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/hooks/
git commit -m "feat: add useGetUnitQuery hook"
```

---

## Task 10: useParsePromptMutation hook

**Files:**

- Create: `apps/web/src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.ts`
- Create: `apps/web/src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.test.tsx`
- Create: `apps/web/src/api/hooks/mutations/useParsePromptMutation/index.ts`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.test.tsx
// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useParsePromptMutation } from "./useParsePromptMutation";
import type { CombatFormState } from "@/lib/calculator/types";

const mockState = { phase: "shooting" } as Partial<CombatFormState>;
const server = setupServer(handlers.parsePrompt.success({ data: mockState }));

describe("useParsePromptMutation", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return parsed state when mutation succeeds", async () => {
    const { result } = renderHook(() => useParsePromptMutation(), {
      wrapper: TestQueryClientProvider,
    });

    await act(async () => {
      await result.current.mutateAsync("10 intercessors shoot at ork boyz");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockState);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.test.tsx
```

Expected: FAIL — `useParsePromptMutation` not defined.

- [ ] **Step 3: Implement useParsePromptMutation**

```ts
// apps/web/src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.ts
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";

export const useParsePromptMutation = () =>
  useMutation({
    mutationFn: (prompt: string) => api.parsePrompt(prompt),
  });
```

```ts
// apps/web/src/api/hooks/mutations/useParsePromptMutation/index.ts
export { useParsePromptMutation } from "./useParsePromptMutation";
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/mutations/useParsePromptMutation/useParsePromptMutation.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/hooks/
git commit -m "feat: add useParsePromptMutation hook"
```

---

## Task 11: useCalculateMutation hook

**Files:**

- Create: `apps/web/src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.ts`
- Create: `apps/web/src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.test.tsx`
- Create: `apps/web/src/api/hooks/mutations/useCalculateMutation/index.ts`

- [ ] **Step 1: Write failing test**

```tsx
// apps/web/src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.test.tsx
// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useCalculateMutation } from "./useCalculateMutation";
import type { CombatInput, CombatResult } from "@/lib/calculator/types";

const mockInput: CombatInput = {
  phase: "shooting",
  attacker: {
    unit: {
      id: "u1",
      name: "A",
      toughness: 4,
      save: 3,
      wounds: 2,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 5,
    selectedWeapons: [],
  },
  defender: {
    unit: {
      id: "u2",
      name: "B",
      toughness: 4,
      save: 6,
      wounds: 1,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 10,
    selectedWeapons: [],
  },
};

const mockResult: Partial<CombatResult> = {
  phase: "shooting",
  primary: {
    attackerName: "A (5)",
    defenderName: "B",
    weaponResults: [],
    totalAverageDamage: 3,
    totalAverageModelsSlain: 3,
  },
};

const server = setupServer(handlers.calculate.success({ data: mockResult }));

describe("useCalculateMutation", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return combat result when mutation succeeds", async () => {
    const { result } = renderHook(() => useCalculateMutation(), {
      wrapper: TestQueryClientProvider,
    });

    await act(async () => {
      await result.current.mutateAsync(mockInput);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResult);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.test.tsx
```

Expected: FAIL — `useCalculateMutation` not defined.

- [ ] **Step 3: Implement useCalculateMutation**

```ts
// apps/web/src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.ts
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api";
import type { CombatInput } from "@/lib/calculator/types";

export const useCalculateMutation = () =>
  useMutation({
    mutationFn: (input: CombatInput) => api.calculate(input),
  });
```

```ts
// apps/web/src/api/hooks/mutations/useCalculateMutation/index.ts
export { useCalculateMutation } from "./useCalculateMutation";
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm --filter @cogitator-tactica/web test src/api/hooks/mutations/useCalculateMutation/useCalculateMutation.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/hooks/
git commit -m "feat: add useCalculateMutation hook"
```

---

## Task 12: Wire CombatForm.tsx

**Files:**

- Modify: `apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx`

- [ ] **Step 1: Replace CombatForm.tsx content**

Replace the full file `apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx`:

```tsx
// src/features/calculator/components/CombatForm/CombatForm.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CombatFormState, Phase, FirstFighter } from "@/lib/calculator/types";
import {
  Button,
  Select,
  NumberInput,
  Checkbox,
  Paper,
  Stack,
  Group,
} from "@cogitator-tactica/ui-kit";
import { IconCrosshair, IconShield, IconSword } from "@tabler/icons-react";
import { WeaponSelector } from "./components/WeaponSelector/WeaponSelector";
import {
  AttackerContextSection,
  relevantContextFlags,
} from "./components/AttackerContextSection/AttackerContextSection";
import styles from "./CombatForm.module.css";
import { useGetUnitsQuery } from "@/api/hooks/queries/useGetUnitsQuery";
import { useGetUnitQuery } from "@/api/hooks/queries/useGetUnitQuery";
import { api } from "@/api";

type Props = {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
};

const CombatForm = ({ state, onChange, onCalculate }: Props) => {
  const queryClient = useQueryClient();
  const { data: unitList = [] } = useGetUnitsQuery();
  const { data: attackerUnit } = useGetUnitQuery(state.attackerUnitId);
  const { data: defenderUnit } = useGetUnitQuery(state.defenderUnitId);

  const handlePhaseChange = (phase: Phase) => {
    const attackerPool = attackerUnit
      ? phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons
      : [];
    const defenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];
    onChange({
      ...state,
      phase,
      attackerWeapons:
        attackerPool.length > 0 ? [{ weaponId: attackerPool[0].id }] : [],
      defenderWeapons:
        defenderPool.length > 0 ? [{ weaponId: defenderPool[0].id }] : [],
    });
  };

  const handleAttackerUnitChange = async (unitId: string) => {
    const unit = await queryClient.fetchQuery({
      queryKey: ["unit", unitId],
      queryFn: () => api.getUnit(unitId),
    });
    const pool = unit
      ? state.phase === "shooting"
        ? unit.shootingWeapons
        : unit.meleeWeapons
      : [];
    onChange({
      ...state,
      attackerUnitId: unitId,
      attackerWeapons: pool.length > 0 ? [{ weaponId: pool[0].id }] : [],
    });
  };

  const handleDefenderUnitChange = async (unitId: string) => {
    const unit = await queryClient.fetchQuery({
      queryKey: ["unit", unitId],
      queryFn: () => api.getUnit(unitId),
    });
    const meleeWeapons = unit ? unit.meleeWeapons : [];
    onChange({
      ...state,
      defenderUnitId: unitId,
      defenderWeapons:
        meleeWeapons.length > 0 ? [{ weaponId: meleeWeapons[0].id }] : [],
    });
  };

  const toggleAttackerWeapon = (weaponId: string) => {
    const isSelected = state.attackerWeapons.some(
      (w) => w.weaponId === weaponId,
    );
    if (isSelected) {
      onChange({
        ...state,
        attackerWeapons: state.attackerWeapons.filter(
          (w) => w.weaponId !== weaponId,
        ),
      });
    } else {
      onChange({
        ...state,
        attackerWeapons: [...state.attackerWeapons, { weaponId }],
      });
    }
  };

  const setAttackerWeaponCount = (weaponId: string, count: number) => {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.map((w) =>
        w.weaponId === weaponId ? { ...w, modelCount: count } : w,
      ),
    });
  };

  const moveAttackerWeaponUp = (weaponId: string) => {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  };

  const moveAttackerWeaponDown = (weaponId: string) => {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  };

  const toggleDefenderWeapon = (weaponId: string) => {
    const isSelected = state.defenderWeapons.some(
      (w) => w.weaponId === weaponId,
    );
    if (isSelected) {
      onChange({
        ...state,
        defenderWeapons: state.defenderWeapons.filter(
          (w) => w.weaponId !== weaponId,
        ),
      });
    } else {
      onChange({
        ...state,
        defenderWeapons: [...state.defenderWeapons, { weaponId }],
      });
    }
  };

  const setDefenderWeaponCount = (weaponId: string, count: number) => {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.map((w) =>
        w.weaponId === weaponId ? { ...w, modelCount: count } : w,
      ),
    });
  };

  const moveDefenderWeaponUp = (weaponId: string) => {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  };

  const moveDefenderWeaponDown = (weaponId: string) => {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  };

  const UNIT_DATA = unitList.map((u) => ({ value: u.id, label: u.name }));
  const attackerWeaponPool = attackerUnit
    ? state.phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons
    : [];
  const attackerContextFlags = relevantContextFlags(
    attackerWeaponPool,
    state.attackerWeapons,
  );
  const defenderContextFlags = relevantContextFlags(
    defenderUnit?.meleeWeapons ?? [],
    state.defenderWeapons,
  );

  return (
    <Stack gap="md">
      <Group gap="xs" justify="center" grow>
        <Button
          variant={state.phase === "shooting" ? "filled" : "default"}
          color={state.phase === "shooting" ? "yellow" : undefined}
          onClick={() => handlePhaseChange("shooting")}
          leftSection={<IconCrosshair size={16} />}
        >
          Shooting
        </Button>
        <Button
          variant={state.phase === "melee" ? "filled" : "default"}
          color={state.phase === "melee" ? "yellow" : undefined}
          onClick={() => handlePhaseChange("melee")}
          leftSection={<IconSword size={16} />}
        >
          Melee
        </Button>
      </Group>
      {state.phase === "melee" && (
        <Group gap="xs" justify="center" grow>
          {(["attacker", "defender"] as FirstFighter[]).map((f) => (
            <Button
              key={f}
              variant={state.firstFighter === f ? "filled" : "default"}
              color={state.firstFighter === f ? "yellow" : undefined}
              leftSection={
                f === "attacker" ? (
                  <IconSword size={16} />
                ) : (
                  <IconShield size={16} />
                )
              }
              onClick={() => onChange({ ...state, firstFighter: f })}
            >
              {f === "attacker"
                ? "Attacker fights first"
                : "Defender fights first"}
            </Button>
          ))}
        </Group>
      )}
      <div className={styles.grid}>
        <Paper>
          <Stack gap="sm">
            <h3 className={styles.attackerHeading}>Attacker</h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.attackerUnitId}
              onChange={(value) => {
                if (value) void handleAttackerUnitChange(value);
              }}
              data={UNIT_DATA}
            />
            <NumberInput
              label="Model Count"
              min={1}
              max={100}
              value={state.attackerCount}
              onChange={(val) =>
                onChange({
                  ...state,
                  attackerCount: typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
            <WeaponSelector
              weapons={attackerWeaponPool}
              selected={state.attackerWeapons}
              defaultModelCount={state.attackerCount}
              weaponType={state.phase}
              onToggle={toggleAttackerWeapon}
              onCountChange={setAttackerWeaponCount}
              onMoveUp={moveAttackerWeaponUp}
              onMoveDown={moveAttackerWeaponDown}
            />
            <AttackerContextSection
              idPrefix="attacker"
              context={state.attackerContext}
              flags={attackerContextFlags}
              onChange={(ctx) => onChange({ ...state, attackerContext: ctx })}
            />
          </Stack>
        </Paper>

        <Paper>
          <Stack gap="sm">
            <h3 className={styles.defenderHeading}>Defender</h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.defenderUnitId}
              onChange={(value) => {
                if (value) void handleDefenderUnitChange(value);
              }}
              data={UNIT_DATA}
            />
            <NumberInput
              label="Model Count"
              min={1}
              max={100}
              value={state.defenderCount}
              onChange={(val) =>
                onChange({
                  ...state,
                  defenderCount: typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
            <Checkbox
              color="yellow"
              checked={state.defenderInCover}
              onChange={(e) =>
                onChange({
                  ...state,
                  defenderInCover: e.currentTarget.checked,
                })
              }
              label={
                <>
                  In Cover{" "}
                  <span className={styles.inCoverHint}>(+1 to save)</span>
                </>
              }
            />
            {state.phase === "melee" && (
              <>
                <WeaponSelector
                  weapons={defenderUnit?.meleeWeapons ?? []}
                  selected={state.defenderWeapons}
                  defaultModelCount={state.defenderCount}
                  weaponType="melee"
                  onToggle={toggleDefenderWeapon}
                  onCountChange={setDefenderWeaponCount}
                  onMoveUp={moveDefenderWeaponUp}
                  onMoveDown={moveDefenderWeaponDown}
                />
                <AttackerContextSection
                  idPrefix="defender"
                  context={state.defenderContext}
                  flags={defenderContextFlags}
                  onChange={(ctx) =>
                    onChange({ ...state, defenderContext: ctx })
                  }
                />
              </>
            )}
          </Stack>
        </Paper>
      </div>

      <Button fullWidth size="lg" color="yellow" onClick={onCalculate}>
        Engage Cogitator
      </Button>
    </Stack>
  );
};

export default CombatForm;
```

- [ ] **Step 2: Run all web tests**

```bash
pnpm --filter @cogitator-tactica/web test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/calculator/components/CombatForm/CombatForm.tsx
git commit -m "feat: wire CombatForm to use React Query hooks"
```

---

## Task 13: Wire PromptInput.tsx

**Files:**

- Modify: `apps/web/src/features/calculator/components/PromptInput/PromptInput.tsx`

- [ ] **Step 1: Replace PromptInput.tsx content**

Replace the full file `apps/web/src/features/calculator/components/PromptInput/PromptInput.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";
import { Textarea, Button, Stack } from "@cogitator-tactica/ui-kit";
import styles from "./PromptInput.module.css";
import clsx from "clsx";
import { useParsePromptMutation } from "@/api/hooks/mutations/useParsePromptMutation";

type Props = {
  className?: string;
  compact?: boolean;
  initialPrompt?: string;
  onParsed: (state: CombatFormState, prompt: string) => void;
  onSimulate: (state: CombatFormState, prompt: string) => void;
};

const PromptInput = ({
  className,
  compact,
  initialPrompt,
  onParsed,
  onSimulate,
}: Props) => {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [loadingAction, setLoadingAction] = useState<
    "parse" | "simulate" | null
  >(null);
  const parsePromptMutation = useParsePromptMutation();

  const parse = async (
    action: "parse" | "simulate",
  ): Promise<CombatFormState | null> => {
    if (!prompt.trim()) return null;
    setLoadingAction(action);
    try {
      return await parsePromptMutation.mutateAsync(prompt);
    } catch {
      return null;
    } finally {
      setLoadingAction(null);
    }
  };

  const handleParse = async () => {
    const state = await parse("parse");
    if (state) onParsed(state, prompt);
  };

  const handleSimulate = async () => {
    const state = await parse("simulate");
    if (state) onSimulate(state, prompt);
  };

  return (
    <Stack className={className} gap={compact ? "xs" : "md"} align="center">
      {!compact && (
        <p className={styles.tagline}>
          Describe the engagement parameters. Probability matrices will be
          computed and rendered for your strategic calculus.
        </p>
      )}
      <div className={styles.inputWrap}>
        <Textarea
          className={styles.textArea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="10 intercessors with bolt rifles shoot at 20 ork boyz in cover"
          error={parsePromptMutation.error?.message ?? null}
          rows={compact ? 1 : 3}
          minRows={compact ? 1 : 3}
          autosize
        />
        <div className={clsx(styles.buttons, compact && styles.buttonsCompact)}>
          <Button
            variant="default"
            onClick={handleParse}
            disabled={!prompt.trim() || loadingAction !== null}
            loading={loadingAction === "parse"}
            fullWidth
          >
            {compact ? "Parse" : "Parse report"}
          </Button>
          <Button
            color="yellow"
            onClick={handleSimulate}
            disabled={!prompt.trim() || loadingAction !== null}
            loading={loadingAction === "simulate"}
            fullWidth
          >
            {compact ? "Engage" : "Engage cogitator"}
          </Button>
        </div>
      </div>
    </Stack>
  );
};

export default PromptInput;
```

- [ ] **Step 2: Run all web tests**

```bash
pnpm --filter @cogitator-tactica/web test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/calculator/components/PromptInput/PromptInput.tsx
git commit -m "feat: wire PromptInput to use useParsePromptMutation"
```

---

## Task 14: Wire results/page.tsx

**Files:**

- Modify: `apps/web/src/app/calculator/results/page.tsx`

- [ ] **Step 1: Replace results/page.tsx content**

Replace the full file `apps/web/src/app/calculator/results/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  CombatFormState,
  CombatResult,
  Phase,
  SelectedWeapon,
  SelectedWeaponInput,
  UnitProfile,
} from "@/lib/calculator/types";
import { useCalculator } from "@/features/calculator/context/CalculatorContext";
import PromptInput from "@/features/calculator/components/PromptInput/PromptInput";
import CombatForm from "@/features/calculator/components/CombatForm/CombatForm";
import ResultsDisplay from "@/features/calculator/components/ResultsDisplay/ResultsDisplay";
import { Accordion, Paper, ScrollArea, Stack } from "@cogitator-tactica/ui-kit";
import styles from "./page.module.css";
import { useCalculateMutation } from "@/api/hooks/mutations/useCalculateMutation";
import { api } from "@/api";

const ACCORDION_VALUE = "combat-parameters";

const resolveWeapons = (
  unit: UnitProfile,
  phase: Phase,
  selectedWeapons: SelectedWeapon[],
  defaultModelCount: number,
): SelectedWeaponInput[] => {
  const pool = phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
  return selectedWeapons
    .map((sw) => {
      const weapon = pool.find((w) => w.id === sw.weaponId);
      return weapon
        ? { weapon, modelCount: sw.modelCount ?? defaultModelCount }
        : null;
    })
    .filter((x): x is SelectedWeaponInput => x !== null);
};

const ResultsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { handoff, setHandoff } = useCalculator();
  const { mutateAsync: calculateAsync } = useCalculateMutation();

  const [form, setForm] = useState<CombatFormState | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<CombatResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);

  const runCalculation = useCallback(
    async (formState: CombatFormState) => {
      setCalculating(true);
      setError(null);
      try {
        const [attacker, defender] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ["unit", formState.attackerUnitId],
            queryFn: () => api.getUnit(formState.attackerUnitId),
          }),
          queryClient.fetchQuery({
            queryKey: ["unit", formState.defenderUnitId],
            queryFn: () => api.getUnit(formState.defenderUnitId),
          }),
        ]);
        const attackerWeapons = resolveWeapons(
          attacker,
          formState.phase,
          formState.attackerWeapons,
          formState.attackerCount,
        );
        const defenderWeapons = resolveWeapons(
          defender,
          "melee",
          formState.defenderWeapons,
          formState.defenderCount,
        );
        if (attackerWeapons.length === 0) {
          setError("No valid attacker weapons selected.");
          return;
        }
        if (formState.phase === "melee" && defenderWeapons.length === 0) {
          setError(
            "No valid defender weapons selected for melee counterattack.",
          );
          return;
        }
        const combatResult = await calculateAsync(
          formState.phase === "shooting"
            ? {
                phase: "shooting",
                attacker: {
                  unit: attacker,
                  modelCount: formState.attackerCount,
                  attackerContext: formState.attackerContext,
                  selectedWeapons: attackerWeapons,
                },
                defender: {
                  unit: defender,
                  modelCount: formState.defenderCount,
                  defenderContext: { inCover: formState.defenderInCover },
                  selectedWeapons: defenderWeapons,
                },
              }
            : {
                phase: "melee",
                attacker: {
                  unit: attacker,
                  modelCount: formState.attackerCount,
                  attackerContext: formState.attackerContext,
                  selectedWeapons: attackerWeapons,
                },
                defender: {
                  unit: defender,
                  modelCount: formState.defenderCount,
                  defenderContext: { inCover: formState.defenderInCover },
                  attackerContext: formState.defenderContext,
                  selectedWeapons: defenderWeapons,
                },
                firstFighter: formState.firstFighter,
              },
        );
        setResult(combatResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Calculation failed");
      } finally {
        setCalculating(false);
      }
    },
    [queryClient, calculateAsync],
  );

  useEffect(() => {
    if (!handoff) {
      router.replace("/calculator");
      return;
    }
    setForm(handoff.form);
    setPrompt(handoff.prompt);
    setAccordionValue(handoff.autoSubmit ? null : ACCORDION_VALUE);
    if (handoff.autoSubmit) {
      runCalculation(handoff.form);
    }
  }, [runCalculation]);

  const handleFormChange = useCallback((next: CombatFormState) => {
    setForm(next);
  }, []);

  const handleCalculate = useCallback(async () => {
    if (form) await runCalculation(form);
  }, [form, runCalculation]);

  const handleParsed = useCallback(
    (nextForm: CombatFormState, nextPrompt: string) => {
      setForm(nextForm);
      setPrompt(nextPrompt);
      setResult(null);
      setAccordionValue(ACCORDION_VALUE);
      setHandoff({ form: nextForm, prompt: nextPrompt, autoSubmit: false });
    },
    [setHandoff],
  );

  const handleSimulate = useCallback(
    async (nextForm: CombatFormState, nextPrompt: string) => {
      setForm(nextForm);
      setPrompt(nextPrompt);
      setResult(null);
      setAccordionValue(null);
      setHandoff({ form: nextForm, prompt: nextPrompt, autoSubmit: true });
      await runCalculation(nextForm);
    },
    [setHandoff, runCalculation],
  );

  if (!form) return null;

  return (
    <>
      <ScrollArea className={styles.page}>
        <div className={styles.content}>
          <Stack gap="xl">
            <Accordion value={accordionValue} onChange={setAccordionValue}>
              <Accordion.Item value={ACCORDION_VALUE}>
                <Accordion.Control>Combat Parameters</Accordion.Control>
                <Accordion.Panel className={styles.panel}>
                  <CombatForm
                    state={form}
                    onChange={handleFormChange}
                    onCalculate={handleCalculate}
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {error && <p className={styles.error}>Error: {error}</p>}

            {calculating ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyHeading}>Computing…</span>
              </div>
            ) : result ? (
              <Paper>
                <ResultsDisplay result={result} />
              </Paper>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>⚙</span>
                <p className={styles.emptyHeading}>Awaiting calculation</p>
                <p className={styles.emptyHint}>
                  Review the parameters above, then hit Calculate or use the
                  Engage button below.
                </p>
              </div>
            )}
          </Stack>
        </div>
      </ScrollArea>
      <div className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          <PromptInput
            compact
            initialPrompt={prompt}
            onParsed={handleParsed}
            onSimulate={handleSimulate}
          />
        </div>
      </div>
    </>
  );
};

export default ResultsPage;
```

- [ ] **Step 2: Run all web tests**

```bash
pnpm --filter @cogitator-tactica/web test
```

Expected: all tests pass.

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @cogitator-tactica/web typecheck
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/calculator/results/page.tsx
git commit -m "feat: wire results page to use useCalculateMutation"
```

---

## Task 15: Run full test suite + typecheck

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: all tests in all packages pass.

- [ ] **Step 2: Run typechecks**

```bash
pnpm --filter @cogitator-tactica/web typecheck
pnpm --filter @cogitator-tactica/backend typecheck
```

Expected: no type errors.

- [ ] **Step 3: Commit if any fixes were needed**

If steps above required small fixes, commit them:

```bash
git add -p
git commit -m "fix: resolve type errors after backend integration"
```
