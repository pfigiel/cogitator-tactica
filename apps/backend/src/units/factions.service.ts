import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

type FactionRecord = { id: string; name: string };

@Injectable()
export class FactionsService {
  constructor(private readonly prisma: PrismaService) {}

  getAllFactions(): Promise<FactionRecord[]> {
    return this.prisma.faction.findMany({ select: { id: true, name: true } });
  }
}
