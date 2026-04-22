# cogitator_tactica Database Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all data from the `wh_calc` Postgres database to a new `cogitator_tactica` database, updating all local infrastructure to match.

**Architecture:** Dump the running `wh_calc` DB to a custom-format file, tear down the container and its volume, start a fresh container with `cogitator_tactica` credentials (using the updated `docker-compose.yml`), then restore the dump with `--no-owner` so all objects are owned by the new role.

**Tech Stack:** Docker Compose, Postgres 17 (pgvector/pgvector:pg17 image), pg_dump / pg_restore, Prisma

---

## File Map

**Modified:**

- `docker-compose.yml` — replace all `wh_calc` references with `cogitator_tactica`

**Unchanged (already correct):**

- `.env.example` — already has `cogitator_tactica` DATABASE_URL
- `.env` — already has `cogitator_tactica` DATABASE_URL

---

## Task 1: Dump the running wh_calc database

**Files:** none (creates `backups/<timestamp>.dump`)

- [ ] **Step 1: Confirm the container is healthy**

```bash
docker compose ps
```

Expected: `wh-calc-postgres-1` shows `Up ... (healthy)`.

- [ ] **Step 2: Dump the database**

```bash
TIMESTAMP=$(date +%Y%m%dT%H%M%S) && docker exec wh-calc-postgres-1 pg_dump -U wh_calc -d wh_calc --no-owner --no-privileges -Fc > backups/${TIMESTAMP}-wh_calc-final.dump && echo "Saved to backups/${TIMESTAMP}-wh_calc-final.dump"
```

Expected: a line like `Saved to backups/20260422T123456-wh_calc-final.dump` and a non-zero file in `backups/`.

- [ ] **Step 3: Verify the dump file is non-empty**

```bash
ls -lh backups/*-wh_calc-final.dump | tail -1
```

Expected: file size several MB (similar to the existing `2026-04-17T17-11-54.dump`). If size is 0 bytes, do not proceed — something went wrong with the dump.

---

## Task 2: Update docker-compose.yml

**Files:**

- Modify: `docker-compose.yml`

- [ ] **Step 1: Replace all wh_calc references with cogitator_tactica**

Replace the entire contents of `docker-compose.yml` with:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: cogitator_tactica
      POSTGRES_PASSWORD: cogitator_tactica
      POSTGRES_DB: cogitator_tactica
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:
        ["CMD-SHELL", "pg_isready -U cogitator_tactica -d cogitator_tactica"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: rename postgres credentials to cogitator_tactica"
```

---

## Task 3: Tear down the old container and volume

**Files:** none

- [ ] **Step 1: Stop and remove container and volume**

```bash
docker compose down -v
```

Expected output includes:

```
Container wh-calc-postgres-1  Removed
Volume wh-calc_postgres_data  Removed
```

(The volume name prefix may vary — that's fine as long as it's removed.)

- [ ] **Step 2: Verify the volume is gone**

```bash
docker volume ls | grep postgres_data
```

Expected: no output. If the old volume still appears, run `docker volume rm <name>` manually.

---

## Task 4: Start fresh container and restore data

**Files:** none

- [ ] **Step 1: Start the new container**

```bash
docker compose up -d
```

Expected: Docker creates a new volume and starts `cogitator-tactica-postgres-1`.

- [ ] **Step 2: Wait for the container to be healthy**

```bash
until [ "$(docker inspect --format='{{.State.Health.Status}}' cogitator-tactica-postgres-1 2>/dev/null)" = "healthy" ]; do echo "waiting..."; sleep 2; done && echo "healthy"
```

Expected: prints `healthy` within ~30 seconds.

- [ ] **Step 3: Identify the dump file to restore**

```bash
DUMP_FILE=$(ls -t backups/*-wh_calc-final.dump | head -1) && echo "Restoring from: $DUMP_FILE"
```

Expected: prints the path to the most recent dump, e.g. `Restoring from: backups/20260422T123456-wh_calc-final.dump`.

- [ ] **Step 4: Restore the dump into the new database**

```bash
docker exec -i cogitator-tactica-postgres-1 pg_restore --no-owner --no-privileges -U cogitator_tactica -d cogitator_tactica < "$DUMP_FILE"
```

Expected: no output (pg_restore is silent on success). Non-fatal notices about existing extensions (e.g. pgvector) may appear — those are fine.

- [ ] **Step 5: Verify row counts match**

```bash
docker exec cogitator-tactica-postgres-1 psql -U cogitator_tactica -d cogitator_tactica -c "SELECT 'units' AS t, COUNT(*) FROM units UNION ALL SELECT 'weapons', COUNT(*) FROM weapons UNION ALL SELECT 'unit_weapons', COUNT(*) FROM unit_weapons;"
```

Expected: three rows with non-zero counts matching what was in `wh_calc` before the migration.

---

## Task 5: Verify Prisma and app connectivity

**Files:** none

- [ ] **Step 1: Run prisma migrate deploy**

```bash
npx prisma migrate deploy
```

Expected: `All migrations have been applied` (or similar no-op message — the migration history was included in the dump).

- [ ] **Step 2: Run prisma studio to confirm data**

```bash
npx prisma studio
```

Open the browser tab. Confirm `Unit`, `Weapon`, and `UnitWeapon` models show data. Close studio (`Ctrl+C`).

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Start dev server and confirm app loads**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm the unit selector populates and combat calculations work. Check the browser console for errors. Stop the server (`Ctrl+C`).
