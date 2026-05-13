# Web App

Next.js frontend and core calculator logic for Cogitator Tactica.

## Responsibilities

- Calculator UI (natural language input + manual combat form)
- Monte Carlo simulation engine (10,000 combat rounds)
- Full 10th Edition rules: sustained hits, lethal hits, devastating wounds, anti-, blast, cover, invulnerable saves, and more
- AI integration (Claude for NL parsing, Voyage AI for semantic unit search)
- Prisma ORM + PostgreSQL with pgvector for unit/weapon data and embeddings
- Next.js API routes serving the calculator backend logic

## Structure

```
src/
  app/               # Next.js App Router pages and API routes
    api/             # API route handlers (calculator, units, etc.)
    calculator/      # Calculator page
  features/
    calculator/      # Calculator UI components and context
  lib/               # Shared utilities (db, llm, embeddings, parsing, units)
scripts/
  import-wahapedia/  # Unit data import from Wahapedia
  generate-embeddings/
```

## Setup

### Environment

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://cogitator_tactica:cogitator_tactica@localhost:5432/cogitator_tactica"
ANTHROPIC_API_KEY=your_key_here
VOYAGE_API_KEY=your_key_here
```

### Database

```bash
# Start database (from repo root)
docker compose up -d

# Apply migrations
pnpm prisma migrate deploy
```

### Unit Data

Unit and weapon data is sourced from Wahapedia:

```bash
pnpm import-units
pnpm generate-embeddings
```

## Scripts

| Command                    | Description                                 |
| -------------------------- | ------------------------------------------- |
| `pnpm dev`                 | Start development server with Turbopack     |
| `pnpm build`               | Production build                            |
| `pnpm start`               | Start production server                     |
| `pnpm test`                | Run tests (Vitest)                          |
| `pnpm lint`                | Lint                                        |
| `pnpm typecheck`           | Type-check                                  |
| `pnpm import-units`        | Import units from Wahapedia                 |
| `pnpm generate-embeddings` | Generate semantic embeddings for all units  |
| `pnpm db:setup`            | Apply migrations and generate Prisma client |
| `pnpm db:dump`             | Dump the database to `backups/`             |

## Database Restore

```bash
pg_restore -h localhost -p 5432 -U cogitator_tactica -d cogitator_tactica -1 ./backups/<backup-name>.dump
```
