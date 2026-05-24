import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { FactionsService } from "./factions.service";
import { PrismaService } from "../database/prisma.service";

describe("FactionsService", () => {
  let service: FactionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactionsService,
        {
          provide: PrismaService,
          useValue: { faction: { findMany: vi.fn() } },
        },
      ],
    }).compile();

    service = module.get<FactionsService>(FactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should return faction records when getAllFactions is called", async () => {
    const factions = [
      { id: "f1", name: "Space Marines" },
      { id: "f2", name: "Orks" },
    ];
    vi.spyOn(prisma.faction, "findMany").mockResolvedValue(factions);

    const result = await service.getAllFactions();

    expect(result).toEqual(factions);
    expect(prisma.faction.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
    });
  });
});
