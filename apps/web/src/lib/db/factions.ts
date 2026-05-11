import { prisma } from ".";

export type FactionRecord = { id: string; name: string };

export const getAllFactions = async (): Promise<FactionRecord[]> =>
  prisma.faction.findMany({ select: { id: true, name: true } });
