# Backend

NestJS API deployed as an AWS Lambda function via Serverless Framework.

## Responsibilities

- HTTP API served via AWS API Gateway + Lambda
- Thin NestJS application shell (currently: health check endpoint)
- Serverless deployment to `eu-central-1`

## Structure

```
src/
  app.module.ts          # Root NestJS module
  database/              # DatabaseModule + PrismaService
  health/                # Health check module and controller
lambda.ts                # Lambda handler (bootstraps NestJS, wraps with serverless-express)
main.ts                  # Local dev entry point
prisma/
  schema.prisma          # Prisma schema (backend owns migrations)
  migrations/            # Migration history
serverless.yml           # Serverless Framework deployment config
```

## Scripts

| Command                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `pnpm dev`               | Start local dev server (ts-node)              |
| `pnpm build`             | Compile TypeScript to `dist/`                 |
| `pnpm start`             | Start compiled production server              |
| `pnpm test`              | Run tests (Jest)                              |
| `pnpm lint`              | Lint                                          |
| `pnpm typecheck`         | Type-check                                    |
| `pnpm clean`             | Remove `dist/`                                |
| `pnpm db:generate`       | Regenerate Prisma client after schema changes |
| `pnpm db:migrate:dev`    | Create a new migration (dev only)             |
| `pnpm db:migrate:deploy` | Apply pending migrations (CI/prod)            |

## Database

Prisma is used for database access. The schema lives in `prisma/schema.prisma`; this app owns migrations.

### Environment

Requires `DATABASE_URL` set to a PostgreSQL connection string:

```
DATABASE_URL=postgresql://user:password@localhost:5432/cogitator_tactica
```

### Working with migrations

| Command                             | Description                                   |
| ----------------------------------- | --------------------------------------------- |
| `pnpm db:generate`                  | Regenerate Prisma client after schema changes |
| `pnpm db:migrate:dev --name <name>` | Create and apply a new migration (dev only)   |
| `pnpm db:migrate:deploy`            | Apply pending migrations (CI/prod)            |

To add a migration:

1. Edit `prisma/schema.prisma`
2. Run `pnpm db:migrate:dev --name describe_your_change`
3. Commit the generated file in `prisma/migrations/`
4. Run `pnpm db:generate` if the client is stale in your editor

## Deployment

Deployed via Serverless Framework using esbuild bundling:

```bash
pnpm serverless deploy
```

Runtime: Node.js 20, AWS region: `eu-central-1`.

All routes (`/` and `/{proxy+}`) are handled by a single Lambda function.
