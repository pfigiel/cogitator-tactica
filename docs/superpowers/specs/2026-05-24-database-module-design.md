# Database Module Design

**Date:** 2026-05-24
**Task:** TASK-14

## Goal

Set up Prisma in the NestJS backend. Expose a singleton `PrismaService` via a `DatabaseModule` that feature modules import explicitly. Pure infrastructure — no repositories, no mappers, no domain logic.

## Schema ownership

Copy `apps/web/prisma/schema.prisma` and `apps/web/prisma/migrations/` into `apps/backend/prisma/`. Backend becomes the long-term schema owner; the web app's schema will be dropped in a future task.

## File structure

```
apps/backend/
  prisma/
    schema.prisma
    migrations/            # copied from apps/web/prisma/migrations/
  src/
    database/
      prisma.service.ts
      database.module.ts
  README.md                # updated with DB setup instructions
```

## Dependencies

Add to `apps/backend/package.json` (exact versions, matching web):

- `@prisma/client: 6.19.3`
- `prisma: 6.19.3` (devDependency)

Add script: `"db:generate": "prisma generate"`

## PrismaService

Extends `PrismaClient`, implements `OnModuleInit` / `OnModuleDestroy`. Connects on module init, disconnects on destroy. No constructor config injection — Prisma reads `DATABASE_URL` from env.

```typescript
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

## DatabaseModule

Non-global. Provides and exports `PrismaService`. Feature modules import `DatabaseModule` to get `PrismaService`.

NestJS caches module instances — importing `DatabaseModule` in multiple feature modules results in a single `PrismaService` instance and a single DB connection.

```typescript
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

`DatabaseModule` is not registered in `AppModule`. Feature modules (Units, Parser, etc.) import it directly.

## README documentation

`apps/backend/README.md` covers:

- Required env var: `DATABASE_URL`
- `pnpm prisma generate` — regenerate client after schema change
- `pnpm prisma migrate dev --name <name>` — create new migration (dev only)
- `pnpm prisma migrate deploy` — apply migrations (CI/prod)

## Testing

`PrismaService` has no business logic — no unit tests needed. Integration tests in future feature modules will exercise it against a real database.
