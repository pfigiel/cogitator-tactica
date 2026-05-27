# Connect Web App to NestJS Backend

**Date:** 2026-05-27
**Task:** TASK-19

## Overview

Migrate all API calls in `apps/web` from Next.js API routes to the NestJS backend (`apps/backend`). Web app calls the backend directly from the browser (no Next.js proxy layer). Next.js API routes are left in place.

## Architecture

Direct client-to-backend: browser fetches hit the NestJS backend at `NEXT_PUBLIC_BACKEND_URL`. React Query manages loading/error state.

Backend URL is read from `NEXT_PUBLIC_BACKEND_URL` env var. Endpoint functions throw if the var is unset.

## Endpoint Mapping

| Endpoint function     | Backend route        | Hook type     |
| --------------------- | -------------------- | ------------- |
| `getUnits()`          | `GET /units`         | `useQuery`    |
| `getUnit(id)`         | `GET /units/:id`     | `useQuery`    |
| `parsePrompt(prompt)` | `POST /parse-prompt` | `useMutation` |
| `calculate(input)`    | `POST /calculate`    | `useMutation` |

## File Structure

Following the centile-grid pattern (`apps/mobile/api/`):

```
apps/web/src/api/
  endpoints/
    getUnits/
      getUnits.ts
      getUnits.test.ts
      index.ts
    getUnit/
      getUnit.ts
      getUnit.test.ts
      index.ts
    parsePrompt/
      parsePrompt.ts
      parsePrompt.test.ts
      index.ts
    calculate/
      calculate.ts
      calculate.test.ts
      index.ts
  hooks/
    queries/
      useGetUnitsQuery/
        useGetUnitsQuery.ts
        useGetUnitsQuery.test.tsx
        index.ts
      useGetUnitQuery/
        useGetUnitQuery.ts
        useGetUnitQuery.test.tsx
        index.ts
    mutations/
      useParsePromptMutation/
        useParsePromptMutation.ts
        useParsePromptMutation.test.tsx
        index.ts
      useCalculateMutation/
        useCalculateMutation.ts
        useCalculateMutation.test.tsx
        index.ts
  tests/
    handlers/
      units.ts
      calculate.ts
      parsePrompt.ts
      index.ts
  index.ts

apps/web/src/test/providers/
  TestQueryClientProvider.tsx
```

## Component Changes

- **`apps/web/src/app/layout.tsx`** — wrap tree with `QueryClientProvider`
- **`CombatForm.tsx`** — replace `useEffect` + `fetch("/api/units")` with `useGetUnitsQuery`; replace `fetch(\`/api/units/${id}\`)`with`useGetUnitQuery(id)`
- **`PromptInput.tsx`** — replace raw `fetch("/api/parse", ...)` with `useParsePromptMutation`
- **`apps/web/src/app/calculator/results/page.tsx`** — replace local `calculate()` import with `useCalculateMutation`

## Backend Changes

- **`apps/backend/main.ts`** — add `app.enableCors()` to allow browser requests

## Configuration

- **`apps/web/.env.example`** — add `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`
- **`apps/web/package.json`** — add `@tanstack/react-query` (dep), `msw` (devDep)

## Testing

Each endpoint function has a unit test using MSW (`setupServer`). Each hook has a test using `TestQueryClientProvider` + MSW. MSW handlers live in `src/api/tests/handlers/` and are namespaced by domain.
