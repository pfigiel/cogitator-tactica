import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseAll } from "./parse";
import { transform } from "./transform";
import { generateUnitsFile } from "./generate";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: { type: "string", default: "SM,ORK" },
    },
  });

  const factions = (values.factions as string).split(",").map((f) => f.trim().toUpperCase());

  console.log(`Importing factions: ${factions.join(", ")}`);

  const data = await parseAll();
  const { units, warnings, skippedKillTeam, countByFaction } = transform(data, factions);

  // Print warnings
  for (const w of warnings) {
    console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
  }

  // Print summary
  const byFaction = factions
    .map((f) => `${f}: ${countByFaction.get(f) ?? 0}`)
    .join(", ");
  console.log(
    `Imported ${units.length} units (${byFaction}). Skipped ${skippedKillTeam} (Kill Team).`,
  );

  // Write output
  const outputPath = join(process.cwd(), "src/data/units.ts");
  const content = generateUnitsFile(units);
  await writeFile(outputPath, content, "utf-8");
  console.log(`Written to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
