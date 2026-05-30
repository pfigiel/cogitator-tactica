import { Test, TestingModule } from "@nestjs/testing";
import { ParsePromptService } from "./parse-prompt.service";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";
import { getMockParsedContext } from "./test/mocks";
import { getMockUnitProfile, getMockWeaponProfile } from "../common/test/mocks";
import { MockProxy } from "vitest-mock-extended";
import { getMockProvider } from "../common/test/utils";

describe("ParsePromptService", () => {
  let service: ParsePromptService;
  let contextExtractionService: MockProxy<ContextExtractionService>;
  let unitResolutionService: MockProxy<UnitResolutionService>;
  let weaponResolutionService: MockProxy<WeaponResolutionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsePromptService,
        getMockProvider(ContextExtractionService),
        getMockProvider(UnitResolutionService),
        getMockProvider(WeaponResolutionService),
      ],
    }).compile();

    service = module.get<ParsePromptService>(ParsePromptService);
    contextExtractionService = module.get<MockProxy<ContextExtractionService>>(
      ContextExtractionService,
    );
    unitResolutionService = module.get<MockProxy<UnitResolutionService>>(
      UnitResolutionService,
    );
    weaponResolutionService = module.get<MockProxy<WeaponResolutionService>>(
      WeaponResolutionService,
    );
  });

  describe("parse", () => {
    it("should return CombatFormState with default weapons when no weapon hints are present", async () => {
      const ctx = getMockParsedContext();
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const closeCombat = getMockWeaponProfile({
        id: "w2",
        name: "Close Combat Weapon",
      });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        shootingWeapons: [boltRifle],
        meleeWeapons: [closeCombat],
      });
      const defenderUnit = getMockUnitProfile({
        id: "u2",
        name: "Boyz",
        shootingWeapons: [boltRifle],
        meleeWeapons: [closeCombat],
      });

      contextExtractionService.extract.mockResolvedValue(ctx);
      unitResolutionService.resolve.mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });

      const result = await service.parse("5 Intercessors shoot 10 Boyz");

      expect(result).toMatchObject({
        phase: "shooting",
        attackerUnitId: "u1",
        attackerCount: 5,
        attackerWeapons: [{ weaponId: "w1" }],
        defenderUnitId: "u2",
        defenderCount: 10,
        defenderInCover: false,
        defenderWeapons: [{ weaponId: "w2" }],
        firstFighter: "attacker",
      });
    });

    it("should not call WeaponResolutionService when no weapon hints are present", async () => {
      const ctx = getMockParsedContext();
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      contextExtractionService.extract.mockResolvedValue(ctx);
      unitResolutionService.resolve.mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });

      await service.parse("some prompt");

      expect(weaponResolutionService.resolve).not.toHaveBeenCalled();
    });

    it("should call WeaponResolutionService and use its result when attacker weapon hints are present", async () => {
      const ctx = getMockParsedContext({
        attackerWeaponHints: [{ name: "Bolt Rifle" }],
      });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      contextExtractionService.extract.mockResolvedValue(ctx);
      unitResolutionService.resolve.mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      weaponResolutionService.resolve.mockResolvedValue({
        attackerWeapons: [{ weaponId: "w1", modelCount: 3 }],
        defenderWeapons: [{ weaponId: "w2" }],
      });

      const result = await service.parse("some prompt");

      expect(result.attackerWeapons).toEqual([
        { weaponId: "w1", modelCount: 3 },
      ]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should use defaultShootingWeaponIds as attackerWeapons when no weapon hints are present and unit has defaults", async () => {
      const ctx = getMockParsedContext({ phase: "shooting" });
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const auxGrenade = getMockWeaponProfile({
        id: "w2",
        name: "Aux Grenade",
      });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        shootingWeapons: [boltRifle, auxGrenade],
        defaultShootingWeaponIds: ["w1"],
      });
      const defenderUnit = getMockUnitProfile({
        id: "u2",
        meleeWeapons: [getMockWeaponProfile({ id: "w3" })],
        defaultMeleeWeaponIds: ["w3"],
      });

      contextExtractionService.extract.mockResolvedValue(ctx);
      unitResolutionService.resolve.mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });

      const result = await service.parse("some prompt");

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w3" }]);
    });

    it("should fall back to first weapon when no weapon hints and no defaults are set", async () => {
      const ctx = getMockParsedContext({ phase: "shooting" });
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const closeCombat = getMockWeaponProfile({
        id: "w2",
        name: "Close Combat Weapon",
      });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        shootingWeapons: [boltRifle],
        defaultShootingWeaponIds: [],
      });
      const defenderUnit = getMockUnitProfile({
        id: "u2",
        meleeWeapons: [closeCombat],
        defaultMeleeWeaponIds: [],
      });

      contextExtractionService.extract.mockResolvedValue(ctx);
      unitResolutionService.resolve.mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });

      const result = await service.parse("some prompt");

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should call WeaponResolutionService when only defender weapon hints are present", async () => {
      const ctx = getMockParsedContext({
        defenderWeaponHints: [{ name: "Choppa" }],
      });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      contextExtractionService.extract.mockResolvedValue(ctx);
      unitResolutionService.resolve.mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      const weaponResolve = weaponResolutionService.resolve.mockResolvedValue({
        attackerWeapons: [{ weaponId: "w1" }],
        defenderWeapons: [{ weaponId: "w2" }],
      });

      await service.parse("some prompt");

      expect(weaponResolve).toHaveBeenCalled();
    });
  });
});
