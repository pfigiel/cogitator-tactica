# Database Migration: wh_calc → cogitator_tactica

## Goal

Rename all database infrastructure from `wh_calc` to `cogitator_tactica` to match the repository rename. Preserve all existing data via a pg_dump/restore cycle.

## Approach

Dump + recreate (Option B): dump the running database, tear down the container and volume, start a fresh container with new credentials, restore the dump.

## Steps

1. **Dump** — `pg_dump` from the running `wh-calc-postgres-1` container into `backups/<timestamp>.dump` using custom format with `--no-owner --no-privileges`.

2. **Update docker-compose.yml** — replace all `wh_calc` references (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, healthcheck command) with `cogitator_tactica`.

3. **Tear down** — `docker compose down -v` to stop the container and remove the named `postgres_data` volume.

4. **Fresh start** — `docker compose up -d` to create a new container with `cogitator_tactica` credentials; Postgres initialises an empty `cogitator_tactica` database.

5. **Restore** — wait for the container to be healthy, then `pg_restore --no-owner --no-privileges -d cogitator_tactica` from the dump file.

6. **Env** — update local `.env` to match the new DATABASE_URL (already correct in `.env.example`).

7. **Prisma sync** — run `npx prisma migrate deploy` to ensure migration history is recorded in the new database.

## Files Changed

- `docker-compose.yml` — only committed code change (wh_calc → cogitator_tactica throughout)

## Notes

- The dump file lands in `backups/` which is already gitignored.
- `--no-owner --no-privileges` ensures restored objects are owned by the new `cogitator_tactica` role, not `wh_calc`.
- Brief local downtime during step 3–5 (seconds).
