# Cogitator Tactica

A combat statistics calculator for Warhammer 40,000 10th Edition. Describe a combat scenario in plain English and get detailed statistical breakdowns of expected hits, wounds, damage, and model casualties — powered by Monte Carlo simulation and Claude AI.

## Features

- **Natural language input** — describe a fight in plain text (e.g. _"10 intercessors with bolt rifles shoot at 20 ork boyz in cover"_)
- **Manual combat form** — pick attacker/defender units, weapons, and tactical modifiers directly
- **Monte Carlo simulation** — runs 10,000 combat rounds to produce accurate probability distributions
- **Full 10th Edition rules** — sustained hits, lethal hits, devastating wounds, anti-, blast, cover, invulnerable saves, and more
- **Shooting and melee phases** both supported
- **Semantic unit/weapon search** — finds units even with fuzzy or partial names

## Tech Stack

- **Frontend/Backend**: Next.js 16 with TypeScript
- **Database**: PostgreSQL 17 with pgvector
- **ORM**: Prisma
- **AI**: Claude (natural language parsing) + Voyage AI (semantic embeddings)
- **UI**: Mantine v9

## Prerequisites

- Node.js 20+
- Docker (for the database) or PostgreSQL 17 with the pgvector extension
- [Anthropic API key](https://console.anthropic.com/)
- [Voyage AI API key](https://www.voyageai.com/)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys and database URL:

```env
DATABASE_URL="postgresql://cogitator_tactica:cogitator_tactica@localhost:5432/cogitator_tactica"
ANTHROPIC_API_KEY=your_key_here
VOYAGE_API_KEY=your_key_here
```

### 3. Start the database

```bash
docker compose up -d
```

### 4. Apply migrations

```bash
npx prisma migrate deploy
```

### 5. Import unit data

Unit and weapon data is sourced from Wahapedia. Import the factions you want:

```bash
npm run import-units
npm run generate-embeddings
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                       | Description                                |
| ----------------------------- | ------------------------------------------ |
| `npm run dev`                 | Start development server with Turbopack    |
| `npm run build`               | Production build                           |
| `npm start`                   | Start production server                    |
| `npm test`                    | Run tests (Vitest)                         |
| `npm run lint`                | Lint                                       |
| `npm run format`              | Format with Prettier                       |
| `npm run import-units`        | Import units from Wahapedia                |
| `npm run generate-embeddings` | Generate semantic embeddings for all units |
| `npm run db:dump`             | Dump the database to `backups/`            |

## Database

### Restore from dump

```bash
pg_restore -h localhost -p 5432 -U cogitator_tactica -d cogitator_tactica -1 ./backups/<backup-name>.dump
```

## License

MIT
