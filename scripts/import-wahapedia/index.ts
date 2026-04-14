import { parseArgs } from "node:util";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseAll } from "./parse";
import { transform } from "./transform";
import { upsertAll } from "./db";

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: { type: "string", default: "SM,ORK" },
    },
  });

  const factions = (values.factions as string)
    .split(",")
    .map((f) => f.trim().toUpperCase());

  console.log(`Importing factions: ${factions.join(", ")}`);

  // Backup current DB before making changes
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(process.cwd(), "backups");
  const backupPath = join(backupDir, `${timestamp}.dump`);
  mkdirSync(backupDir, { recursive: true });

  console.log(`Backing up database to backups/${timestamp}.dump ...`);
  execSync(`pg_dump "${databaseUrl}" -Fc -f "${backupPath}"`, {
    stdio: "inherit",
  });
  console.log("Backup complete.");

  const data = await parseAll();
  const { units, warnings, skippedKillTeam, countByFaction } = transform(
    data,
    factions,
  );

  for (const w of warnings) {
    console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
  }

  const byFaction = factions
    .map((f) => `${f}: ${countByFaction.get(f) ?? 0}`)
    .join(", ");
  console.log(
    `Importing ${units.length} units (${byFaction}). Skipped ${skippedKillTeam} (Kill Team).`,
  );

  await upsertAll(units);
  console.log("Done.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
