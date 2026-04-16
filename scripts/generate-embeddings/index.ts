import { PrismaClient, Prisma, Faction } from "@prisma/client";

const prisma = new PrismaClient();

export const buildUnitEmbeddingText = (unit: {
  name: string;
  keywords: string[];
  weapons: string[];
}): string => [unit.name, ...unit.keywords, ...unit.weapons].join(" ");

const BATCH_SIZE = 128;

const main = async () => {
  const { embedTexts } = await import("../../src/lib/embeddings/common/voyage");
  const { values } = (await import("node:util")).parseArgs({
    args: process.argv.slice(2),
    options: {
      factions: {
        type: "string",
        default: Object.values(Faction).join(","),
      },
    },
  });

  const factions = (values.factions as string)
    .split(",")
    .map((f) => f.trim()) as Faction[];

  const units = await prisma.unit.findMany({
    where: { factionId: { in: factions } },
    include: { unitWeapons: { include: { weapon: true } } },
  });

  console.log(`Generating embeddings for ${units.length} units...`);

  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);
    const texts = batch.map((u) =>
      buildUnitEmbeddingText({
        name: u.name,
        keywords: u.keywords,
        weapons: u.unitWeapons.map((uw) => uw.weapon.name),
      }),
    );

    const embeddings = await embedTexts(texts);

    for (let j = 0; j < batch.length; j++) {
      const vectorLiteral = Prisma.raw(
        `'[${embeddings[j].join(",")}]'::vector`,
      );
      await prisma.$executeRaw`
        UPDATE units SET embedding = ${vectorLiteral} WHERE id = ${batch[j].id}
      `;
    }

    console.log(
      `  ${Math.min(i + BATCH_SIZE, units.length)}/${units.length} done`,
    );
  }

  console.log("All embeddings generated.");
  await prisma.$disconnect();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
