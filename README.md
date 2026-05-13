# Cogitator Tactica

A combat statistics calculator for Warhammer 40,000 10th Edition. Describe a combat scenario in plain English and get detailed statistical breakdowns of expected hits, wounds, damage, and model casualties — powered by Monte Carlo simulation and Claude AI.

🚀 **Live app**: [cogitator-tactica.vercel.app/calculator](https://cogitator-tactica.vercel.app/calculator)

## Monorepo Structure

```
apps/
  web/       # Next.js frontend + calculator logic + AI integration
  backend/   # NestJS API deployed as AWS Lambda
packages/
  ui-kit/        # Shared Mantine-based component library
  eslint-plugin/ # Custom ESLint rules
```

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 16, TypeScript, Mantine v9
- **Backend**: NestJS 11, deployed via Serverless Framework to AWS Lambda
- **Database**: PostgreSQL 17 with pgvector (via Prisma)
- **AI**: Claude (natural language parsing) + Voyage AI (semantic embeddings)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for the database) or PostgreSQL 17 with the pgvector extension
- [Anthropic API key](https://console.anthropic.com/)
- [Voyage AI API key](https://www.voyageai.com/)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/web/.env.example apps/web/.env
```

Fill in your API keys and database URL.

### 3. Start the database

```bash
docker compose up -d
```

### 4. Start dev servers

```bash
pnpm dev
```

This starts all apps in parallel via Turborepo. See individual app READMEs for app-specific setup (database migrations, unit data import, etc.).

## Root Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start all apps in development mode |
| `pnpm build`        | Build all apps and packages        |
| `pnpm lint`         | Lint all apps and packages         |
| `pnpm typecheck`    | Type-check all apps and packages   |
| `pnpm test`         | Run all tests                      |
| `pnpm format`       | Format all files with Prettier     |
| `pnpm format:check` | Check formatting without writing   |
| `pnpm backlog`      | Open backlog browser               |

## License

MIT
