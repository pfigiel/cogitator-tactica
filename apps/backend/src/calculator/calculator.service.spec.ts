import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { CalculatorService } from "./calculator.service";
import { SimulationService } from "./simulation.service";
import { getMockProvider } from "../common/test/utils";
import { getMockCombatInput } from "./test/mocks";
import { getMockUnitProfile, getMockWeaponProfile } from "../common/test/mocks";

describe("CalculatorService", () => {
  let service: CalculatorService;
  let simulationService: MockProxy<SimulationService>;

  beforeEach(async () => {
    const simulationProvider = getMockProvider(SimulationService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CalculatorService, simulationProvider],
    }).compile();

    service = module.get<CalculatorService>(CalculatorService);
    simulationService =
      module.get<MockProxy<SimulationService>>(SimulationService);
  });

  describe("calculate", () => {
    it("should return shooting CombatResult with primary direction when phase is shooting", async () => {
      const weaponResult = {
        weaponName: "Bolter",
        modelCount: 5,
        steps: [],
        averageDamage: 2,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);
      const input = getMockCombatInput({ phase: "shooting" });

      const result = await service.calculate(input);

      expect(result).toEqual({
        phase: "shooting",
        primary: {
          attackerName: "unit-name (5)",
          defenderName: "unit-name",
          totalAverageDamage: 2,
          totalAverageModelsSlain: 1,
          weaponResults: [weaponResult],
        },
      });
    });

    it("should call runSimulation once per selected weapon when phase is shooting", async () => {
      const weaponResult = {
        weaponName: "Bolter",
        modelCount: 5,
        steps: [],
        averageDamage: 2,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);
      const weapon1 = getMockWeaponProfile({ id: "w1" });
      const weapon2 = getMockWeaponProfile({ id: "w2" });
      const input = getMockCombatInput({
        phase: "shooting",
        attacker: {
          unit: getMockUnitProfile(),
          modelCount: 5,
          selectedWeapons: [
            { weapon: weapon1, modelCount: 5 },
            { weapon: weapon2, modelCount: 3 },
          ],
        },
      });

      await service.calculate(input);

      expect(simulationService.runSimulation).toHaveBeenCalledTimes(2);
    });

    it("should return melee CombatResult with primary and counterattack when phase is melee", async () => {
      const weaponResult = {
        weaponName: "Sword",
        modelCount: 5,
        steps: [],
        averageDamage: 3,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);
      const attacker = getMockUnitProfile({ name: "Attacker" });
      const defender = getMockUnitProfile({ name: "Defender" });
      const input = getMockCombatInput({
        phase: "melee",
        attacker: {
          unit: attacker,
          modelCount: 5,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 5 }],
        },
        defender: {
          unit: defender,
          modelCount: 10,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 10 }],
        },
        firstFighter: "attacker",
      });

      const result = await service.calculate(input);

      expect(result).toEqual({
        phase: "melee",
        firstFighterNote:
          "Attacker fights first. Casualties from the primary attack are not yet reflected in the counterattack counts.",
        primary: {
          attackerName: "Attacker (5)",
          defenderName: "Defender",
          totalAverageDamage: 3,
          totalAverageModelsSlain: 1,
          weaponResults: [weaponResult],
        },
        counterattack: {
          attackerName: "Defender (10)",
          defenderName: "Attacker",
          totalAverageDamage: 3,
          totalAverageModelsSlain: 1,
          weaponResults: [weaponResult],
        },
      });
    });

    it("should return melee CombatResult with defender firstFighterNote when firstFighter is defender", async () => {
      const weaponResult = {
        weaponName: "Sword",
        modelCount: 5,
        steps: [],
        averageDamage: 3,
        averageModelsSlain: 1,
      };
      simulationService.runSimulation.mockResolvedValue(weaponResult);
      const attacker = getMockUnitProfile({ name: "Marines" });
      const defender = getMockUnitProfile({ name: "Orks" });
      const input = getMockCombatInput({
        phase: "melee",
        attacker: {
          unit: attacker,
          modelCount: 5,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 5 }],
        },
        defender: {
          unit: defender,
          modelCount: 10,
          selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 10 }],
        },
        firstFighter: "defender",
      });

      const result = await service.calculate(input);

      expect(result).toEqual({
        phase: "melee",
        firstFighterNote:
          "Orks fights first. Their counterattack resolves before Marines attacks. Casualties from the counterattack are not yet reflected in the primary attack (full model counts used).",
        primary: {
          attackerName: "Marines (5)",
          defenderName: "Orks",
          totalAverageDamage: 3,
          totalAverageModelsSlain: 1,
          weaponResults: [weaponResult],
        },
        counterattack: {
          attackerName: "Orks (10)",
          defenderName: "Marines",
          totalAverageDamage: 3,
          totalAverageModelsSlain: 1,
          weaponResults: [weaponResult],
        },
      });
    });
  });
});
