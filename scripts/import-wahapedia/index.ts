import { parseArgs } from "node:util";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseAll } from "./parse";
import { transform } from "./transform";
import { upsertAll, updateAltNames, disconnect } from "./db";
import { generateAltNames } from "./alt-names";

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: { type: "string", default: "SM,ORK" },
    },
  });

  const factions_filter = (values.factions as string)
    .split(",")
    .map((f) => f.trim().toUpperCase());

  console.log(`Importing factions: ${factions_filter.join(", ")}`);

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
  const { units, warnings, countByFaction, factions } = transform(
    data,
    factions_filter,
  );

  for (const w of warnings) {
    console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
  }

  const byFaction = factions_filter
    .map((f) => `${f}: ${countByFaction.get(f) ?? 0}`)
    .join(", ");
  console.log(`Importing ${units.length} units (${byFaction}).`);

  await upsertAll(units, factions);
  console.log("Units upserted.");

  const factionNameById = new Map(factions.map((f) => [f.id, f.name]));
  const unitsByFaction = new Map<string, { id: string; name: string }[]>();
  for (const unit of units) {
    const list = unitsByFaction.get(unit.factionId) ?? [];
    list.push({ id: unit.id, name: unit.name });
    unitsByFaction.set(unit.factionId, list);
  }

  for (const [factionId, factionUnits] of unitsByFaction) {
    const factionName = factionNameById.get(factionId) ?? factionId;
    console.log(
      `Generating alt names for ${factionName} (${factionUnits.length} units)...`,
    );
    const altNames = await generateAltNames(factionUnits, factionName);
    await updateAltNames(altNames);
  }

  console.log("Done.");
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => disconnect());
