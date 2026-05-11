import { parseArgs } from "node:util";
import { parseAll } from "./parse";
import { transform } from "./transform";
import { upsertAll, updateAltNames, disconnect } from "./db";
import { generateAltNames } from "./alt-names";

const main = async () => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: { type: "string" },
    },
  });

  const factions_filter = values.factions
    ? (values.factions as string).split(",").map((f) => f.trim().toUpperCase())
    : null;

  console.log(
    factions_filter
      ? `Importing factions: ${factions_filter.join(", ")}`
      : "Importing all factions",
  );

  const data = await parseAll();
  const { units, warnings, countByFaction, factions } = transform(
    data,
    factions_filter ?? undefined,
  );

  for (const w of warnings) {
    console.warn(`[WARN] ${w.unitName} / ${w.weaponName}: ${w.message}`);
  }

  const byFaction = [...countByFaction.entries()]
    .map(([f, n]) => `${f}: ${n}`)
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
