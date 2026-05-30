import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { UnitsService } from "./units.service";
import { PrismaService } from "../database/prisma.service";
import {
  getMockDbUnit,
  getMockDbUnitWithWeapons,
} from "../database/test/mocks";

describe("UnitsService", () => {
  let service: UnitsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
    prisma = module.get<DeepMockProxy<PrismaService>>(PrismaService);
  });

  describe("listUnits", () => {
    it("should return id and name array when listUnits is called", async () => {
      const units = [
        getMockDbUnit({ id: "unit-1", name: "Intercessors" }),
        getMockDbUnit({ id: "unit-2", name: "Tactical Marines" }),
      ];
      prisma.unit.findMany.mockResolvedValue(units);

      const result = await service.listUnits();

      expect(result).toEqual(units);
      expect(prisma.unit.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("getUnit", () => {
    it("should return UnitProfile when unit exists", async () => {
      const dbUnit = getMockDbUnitWithWeapons({
        id: "unit-1",
        name: "Intercessors",
        toughness: 4,
        save: 3,
        invuln: null,
        wounds: 2,
        keywords: ["Infantry"],
        factionId: "f1",
        altNames: [],
        unitWeapons: [
          {
            unitId: "unit-1",
            weaponId: "w1",
            isDefault: false,
            weapon: {
              id: "w1",
              name: "Bolt Rifle",
              type: "shooting",
              attacks: "1",
              skill: 3,
              strength: "4",
              ap: -1,
              damage: "1",
              abilities: [],
            },
          },
        ],
      });
      prisma.unit.findUnique.mockResolvedValue(dbUnit);

      const result = await service.getUnit("unit-1");

      expect(result).toEqual({
        id: "unit-1",
        keywords: ["Infantry"],
        meleeWeapons: [],
        name: "Intercessors",
        save: 3,
        shootingWeapons: [
          {
            abilities: [],
            ap: -1,
            attacks: 1,
            damage: 1,
            id: "w1",
            name: "Bolt Rifle",
            skill: 3,
            strength: 4,
          },
        ],
        toughness: 4,
        wounds: 2,
        defaultShootingWeaponIds: [],
        defaultMeleeWeaponIds: [],
      });
      expect(prisma.unit.findUnique).toHaveBeenCalledWith({
        where: { id: "unit-1" },
        include: { unitWeapons: { include: { weapon: true } } },
      });
    });

    it("should return defaultShootingWeaponIds and defaultMeleeWeaponIds from isDefault flags", async () => {
      const dbUnit = getMockDbUnitWithWeapons({
        id: "unit-1",
        name: "Intercessors",
        toughness: 4,
        save: 3,
        invuln: null,
        wounds: 2,
        keywords: [],
        factionId: "f1",
        altNames: [],
        unitWeapons: [
          {
            unitId: "unit-1",
            weaponId: "w1",
            isDefault: true,
            weapon: {
              id: "w1",
              name: "Bolt Rifle",
              type: "shooting",
              attacks: "1",
              skill: 3,
              strength: "4",
              ap: -1,
              damage: "1",
              abilities: [],
            },
          },
          {
            unitId: "unit-1",
            weaponId: "w2",
            isDefault: false,
            weapon: {
              id: "w2",
              name: "Close Combat Weapon",
              type: "melee",
              attacks: "2",
              skill: 3,
              strength: "3",
              ap: 0,
              damage: "1",
              abilities: [],
            },
          },
        ],
      });
      prisma.unit.findUnique.mockResolvedValue(dbUnit);

      const result = await service.getUnit("unit-1");

      expect(result?.defaultShootingWeaponIds).toEqual(["w1"]);
      expect(result?.defaultMeleeWeaponIds).toEqual([]);
    });

    it("should return null when unit does not exist", async () => {
      prisma.unit.findUnique.mockResolvedValue(null);

      const result = await service.getUnit("missing");

      expect(result).toBeNull();
    });
  });

  describe("searchUnitsByEmbedding", () => {
    it("should return query results when searchUnitsByEmbedding is called", async () => {
      const expected = [{ id: "unit-1", name: "Intercessors", altNames: [] }];
      prisma.$queryRaw.mockResolvedValue(expected);

      const result = await service.searchUnitsByEmbedding([0.1, 0.2, 0.3]);

      expect(result).toEqual(expected);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("should include faction filter when factionId is provided", async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.searchUnitsByEmbedding([0.1, 0.2], 5, "faction-1");

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe("searchUnitsByFuzzyNameMatch", () => {
    it("should return best matching candidate when unitName matches", () => {
      const candidates = [
        { id: "u1", name: "Intercessors", altNames: [] },
        { id: "u2", name: "Terminators", altNames: [] },
      ];

      const result = service.searchUnitsByFuzzyNameMatch(
        "Intercessor",
        candidates,
      );

      expect(result?.id).toBe("u1");
    });

    it("should return null when candidates list is empty", () => {
      const result = service.searchUnitsByFuzzyNameMatch("anything", []);

      expect(result).toBeNull();
    });

    it("should match on alt names when primary name does not match", () => {
      const candidates = [
        { id: "u1", name: "Intercessors", altNames: ["Bolter Boys"] },
      ];

      const result = service.searchUnitsByFuzzyNameMatch(
        "Bolter Boys",
        candidates,
      );

      expect(result?.id).toBe("u1");
    });
  });
});
