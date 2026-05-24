---
id: TASK-14
title: Set up database module
status: Done
assignee: []
created_date: "2026-05-24"
updated_date: "2026-05-24 20:02"
labels: []
milestone: m-0
dependencies: []
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Set up Prisma in the NestJS backend and expose an injectable `PrismaService` via a `DatabaseModule`. This is pure infrastructure — no repositories, no mappers, no domain logic.

**What to do:**

- Copy the Prisma schema from `apps/web/prisma/schema.prisma` into `apps/backend/prisma/schema.prisma` (or reference it via a shared path — evaluate what fits the monorepo setup best)
- Generate the Prisma client for the backend app
- Create `src/database/prisma.service.ts` — an injectable NestJS service extending `PrismaClient`, handling `onModuleInit` / `onModuleDestroy` lifecycle hooks
- Create `src/database/database.module.ts` — a global or exportable module that provides and exports `PrismaService`

Do not register the module in the app module - it will be registered and used by future modules that need DB access.

`PrismaService` is the only thing this module needs to expose. Feature modules (Units, Parser, etc.) will inject it directly to build their own repositories and mappers.

<!-- SECTION:DESCRIPTION:END -->
