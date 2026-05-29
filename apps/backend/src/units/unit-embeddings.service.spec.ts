import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { UnitEmbeddingsService } from "./unit-embeddings.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { PrismaService } from "../database/prisma.service";
import { getMockDbUnitWithWeapons } from "../database/test/mocks";

describe("UnitEmbeddingsService", () => {
  let service: UnitEmbeddingsService;
  let embeddings: DeepMockProxy<EmbeddingsService>;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitEmbeddingsService,
        { provide: EmbeddingsService, useValue: mockDeep<EmbeddingsService>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(UnitEmbeddingsService);
    embeddings = module.get(EmbeddingsService);
    prisma = module.get(PrismaService);
  });

  describe("buildEmbeddingText", () => {
    it("should return only unit name line when only name is provided", () => {
      const result = service.buildEmbeddingText({ name: "Intercessors" });
      expect(result).toBe("Unit: Intercessors");
    });

    it("should include all fields when all params are provided", () => {
      const result = service.buildEmbeddingText({
        name: "Intercessors",
        altNames: ["Intercessor Squad"],
        faction: "Space Marines",
        meleeWeapons: ["Bolt Pistol"],
        rangedWeapons: ["Bolt Rifle"],
      });
      expect(result).toBe(
        "Unit: Intercessors\nAlternative names: Intercessor Squad\nFaction: Space Marines\nMelee weapons: Bolt Pistol\nRanged weapons: Bolt Rifle",
      );
    });

    it("should omit optional fields when arrays are empty", () => {
      const result = service.buildEmbeddingText({
        name: "Intercessors",
        altNames: [],
        meleeWeapons: [],
        rangedWeapons: [],
      });
      expect(result).toBe("Unit: Intercessors");
    });
  });

  describe("generateAndStore", () => {
    it("should call embedTexts with built texts and update each unit when generateAndStore is called", async () => {
      const unit = getMockDbUnitWithWeapons({
        id: "u1",
        name: "Intercessors",
        factionId: "f1",
        altNames: [],
        unitWeapons: [],
      });
      embeddings.embedTexts.mockResolvedValue([[0.1, 0.2]]);
      prisma.$executeRaw.mockResolvedValue(1);

      await service.generateAndStore(
        [unit],
        new Map([["f1", "Space Marines"]]),
      );

      expect(embeddings.embedTexts).toHaveBeenCalledWith([
        "Unit: Intercessors\nFaction: Space Marines",
      ]);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("should process units in two batches when generateAndStore is called with 130 units", async () => {
      const units = Array.from({ length: 130 }, (_, i) =>
        getMockDbUnitWithWeapons({
          id: `u${i}`,
          name: `Unit ${i}`,
          factionId: "f1",
          altNames: [],
          unitWeapons: [],
        }),
      );
      embeddings.embedTexts
        .mockResolvedValueOnce(Array(128).fill([0.1]))
        .mockResolvedValueOnce(Array(2).fill([0.1]));
      prisma.$executeRaw.mockResolvedValue(1);

      await service.generateAndStore(units, new Map([["f1", "Space Marines"]]));

      expect(embeddings.embedTexts).toHaveBeenCalledTimes(2);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(130);
    });
  });
});
