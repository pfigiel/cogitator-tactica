import { embedTexts } from "../../src/lib/voyage";
import { PrismaClient, Prisma, Faction } from "@prisma/client";

const prisma = new PrismaClient();

export const buildUnitEmbeddingText = (unit: {
  name: string;
  keywords: string[];
  weapons: string[];
}): string => [unit.name, ...unit.keywords, ...unit.weapons].join(" ");
