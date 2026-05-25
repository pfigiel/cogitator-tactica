import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { UnitResolutionService } from "./unit-resolution.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { UnitsService } from "../units/units.service";
import { FactionsService } from "../units/factions.service";
import type { UnitProfile } from "../common/types";
import type { ParsedContext } from "./types";

const makeCtx = (overrides: Partial<ParsedContext> = {}): ParsedContext => ({
  attackerName: "Intercessors",
  defenderName: "Boyz",
  attackerCount: 5,
  defenderCount: 10,
  phase: "shooting",
  defenderInCover: false,
  firstFighter: "attacker",
  attackerWeaponHints: [],
  defenderWeaponHints: [],
  ...overrides,
});

const makeUnit = (id: string, name: string): UnitProfile => ({
  id,
  name,
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
});

describe("UnitResolutionService", () => {
  let service: UnitResolutionService;
  let embeddingsService: EmbeddingsService;
  let unitsService: UnitsService;
  let factionsService: FactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitResolutionService,
        {
          provide: EmbeddingsService,
          useValue: { embedTexts: vi.fn() },
        },
        {
          provide: UnitsService,
          useValue: {
            searchUnitsByEmbedding: vi.fn(),
            searchUnitsByFuzzyNameMatch: vi.fn(),
            getUnit: vi.fn(),
          },
        },
        {
          provide: FactionsService,
          useValue: { getAllFactions: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<UnitResolutionService>(UnitResolutionService);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
    unitsService = module.get<UnitsService>(UnitsService);
    factionsService = module.get<FactionsService>(FactionsService);
  });

  describe("resolve", () => {
    it("should return attacker and defender UnitProfiles when both units are found", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(embeddingsService, "embedTexts").mockResolvedValue([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding")
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([{ id: "u2", name: "Boyz", altNames: [] }]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch")
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce({ id: "u2", name: "Boyz", altNames: [] });
      vi.spyOn(unitsService, "getUnit")
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(defenderUnit);

      const result = await service.resolve(makeCtx());

      expect(result.attackerUnit).toEqual(attackerUnit);
      expect(result.defenderUnit).toEqual(defenderUnit);
    });

    it("should throw when attacker unit cannot be resolved", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(embeddingsService, "embedTexts").mockResolvedValue([
        [0.1],
        [0.2],
      ]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding").mockResolvedValue([]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch").mockReturnValue(
        null,
      );
      vi.spyOn(unitsService, "getUnit").mockResolvedValue(null);

      await expect(service.resolve(makeCtx())).rejects.toThrow(
        'Could not resolve units: attacker="Intercessors", defender="Boyz"',
      );
    });

    it("should throw when defender unit cannot be resolved", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors");

      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(embeddingsService, "embedTexts").mockResolvedValue([
        [0.1],
        [0.2],
      ]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding")
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch")
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce(null);
      vi.spyOn(unitsService, "getUnit")
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(null);

      await expect(service.resolve(makeCtx())).rejects.toThrow(
        'Could not resolve units: attacker="Intercessors", defender="Boyz"',
      );
    });

    it("should include weapon hints in embedding text when hints are present", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      const embedTexts = vi
        .spyOn(embeddingsService, "embedTexts")
        .mockResolvedValue([[0.1], [0.2]]);
      vi.spyOn(unitsService, "searchUnitsByEmbedding")
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([{ id: "u2", name: "Boyz", altNames: [] }]);
      vi.spyOn(unitsService, "searchUnitsByFuzzyNameMatch")
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce({ id: "u2", name: "Boyz", altNames: [] });
      vi.spyOn(unitsService, "getUnit")
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(defenderUnit);

      await service.resolve(
        makeCtx({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
      );

      expect(embedTexts).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("Bolt Rifle")]),
      );
    });
  });
});
