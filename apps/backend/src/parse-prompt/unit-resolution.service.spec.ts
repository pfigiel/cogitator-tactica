import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { UnitResolutionService } from "./unit-resolution.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { UnitsService } from "../units/units.service";
import { FactionsService } from "../units/factions.service";
import { getMockUnitProfile } from "../common/test/mocks";
import { getMockParsedContext } from "./test/mocks";
import { getMockProvider } from "../common/test/utils";

describe("UnitResolutionService", () => {
  let service: UnitResolutionService;
  let embeddingsService: MockProxy<EmbeddingsService>;
  let unitsService: MockProxy<UnitsService>;
  let factionsService: MockProxy<FactionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitResolutionService,
        getMockProvider(EmbeddingsService),
        getMockProvider(UnitsService),
        getMockProvider(FactionsService),
      ],
    }).compile();

    service = module.get<UnitResolutionService>(UnitResolutionService);
    embeddingsService =
      module.get<MockProxy<EmbeddingsService>>(EmbeddingsService);
    unitsService = module.get<MockProxy<UnitsService>>(UnitsService);
    factionsService = module.get<MockProxy<FactionsService>>(FactionsService);
  });

  describe("resolve", () => {
    it("should return attacker and defender UnitProfiles when both units are found", async () => {
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      factionsService.getAllFactions.mockResolvedValue([]);
      embeddingsService.embedTexts.mockResolvedValue([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      unitsService.searchUnitsByEmbedding
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([{ id: "u2", name: "Boyz", altNames: [] }]);
      unitsService.searchUnitsByFuzzyNameMatch
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce({ id: "u2", name: "Boyz", altNames: [] });
      unitsService.getUnit
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(defenderUnit);

      const result = await service.resolve(getMockParsedContext());

      expect(result.attackerUnit).toEqual(attackerUnit);
      expect(result.defenderUnit).toEqual(defenderUnit);
    });

    it("should throw when attacker unit cannot be resolved", async () => {
      factionsService.getAllFactions.mockResolvedValue([]);
      embeddingsService.embedTexts.mockResolvedValue([[0.1], [0.2]]);
      unitsService.searchUnitsByEmbedding.mockResolvedValue([]);
      unitsService.searchUnitsByFuzzyNameMatch.mockReturnValue(null);
      unitsService.getUnit.mockResolvedValue(null);

      await expect(service.resolve(getMockParsedContext())).rejects.toThrow(
        'Could not resolve units: attacker="Intercessors", defender="Boyz"',
      );
    });

    it("should throw when defender unit cannot be resolved", async () => {
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
      });

      factionsService.getAllFactions.mockResolvedValue([]);
      embeddingsService.embedTexts.mockResolvedValue([[0.1], [0.2]]);
      unitsService.searchUnitsByEmbedding
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([]);
      unitsService.searchUnitsByFuzzyNameMatch
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce(null);
      unitsService.getUnit
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(null);

      await expect(service.resolve(getMockParsedContext())).rejects.toThrow(
        'Could not resolve units: attacker="Intercessors", defender="Boyz"',
      );
    });

    it("should include weapon hints in embedding text when hints are present", async () => {
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      factionsService.getAllFactions.mockResolvedValue([]);
      embeddingsService.embedTexts.mockResolvedValue([[0.1], [0.2]]);
      unitsService.searchUnitsByEmbedding
        .mockResolvedValueOnce([
          { id: "u1", name: "Intercessors", altNames: [] },
        ])
        .mockResolvedValueOnce([{ id: "u2", name: "Boyz", altNames: [] }]);
      unitsService.searchUnitsByFuzzyNameMatch
        .mockReturnValueOnce({ id: "u1", name: "Intercessors", altNames: [] })
        .mockReturnValueOnce({ id: "u2", name: "Boyz", altNames: [] });
      unitsService.getUnit
        .mockResolvedValueOnce(attackerUnit)
        .mockResolvedValueOnce(defenderUnit);

      await service.resolve(
        getMockParsedContext({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
      );

      expect(embeddingsService.embedTexts).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining("Bolt Rifle")]),
      );
    });
  });
});
