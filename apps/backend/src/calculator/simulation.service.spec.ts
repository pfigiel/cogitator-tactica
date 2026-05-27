import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { SimulationService } from "./simulation.service";
import { RngService } from "./rng.service";
import { getMockProvider } from "../common/test/utils";
import { getMockUnitProfile, getMockWeaponProfile } from "../common/test/mocks";
import {
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
  WeaponProfile,
} from "../common/types";
import type { DiceExpression } from "../common/types";

describe("SimulationService", () => {
  const infantryProfile = getMockUnitProfile({ save: 4, wounds: 1 });

  const tankProfile = getMockUnitProfile({
    toughness: 8,
    save: 2,
    wounds: 10,
    keywords: ["VEHICLE"],
  });

  const basicWeaponProfile = getMockWeaponProfile({
    name: "Bolter",
    attacks: 1,
    ap: 0,
  });

  let service: SimulationService;
  let rng: MockProxy<RngService>;

  beforeEach(async () => {
    const rngProvider = getMockProvider(RngService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [SimulationService, rngProvider],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    rng = module.get<MockProxy<RngService>>(RngService);
  });

  const mockRoll = (value: number) => {
    rng.dice.mockReturnValue(value);
    rng.dice.mockImplementation((expr: DiceExpression) => {
      if (typeof expr === "number") return expr;
      const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const mod = match[3] ? parseInt(match[3], 10) : 0;
      return count * value + mod;
    });
  };

  describe("runSimulation", () => {
    it("should return WeaponResult with correct name and modelCount when called", async () => {
      mockRoll(1);

      const result = await service.runSimulation(
        basicWeaponProfile,
        2,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.weaponName).toBe("Bolter");
      expect(result.modelCount).toBe(2);
    });

    it("should return 6 steps with correct labels when called", async () => {
      mockRoll(1);

      const result = await service.runSimulation(
        basicWeaponProfile,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps).toHaveLength(6);
      expect(result.steps.map((s) => s.label)).toEqual([
        "Attacks",
        "Hits",
        "Wounds",
        "Unsaved Wounds",
        "Damage",
        "Models Slain",
      ]);
    });

    it("should set step[n].input equal to step[n-1].average for all steps when called", async () => {
      mockRoll(6);

      const result = await service.runSimulation(
        { ...basicWeaponProfile, ap: 3 },
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        100,
      );

      for (let i = 1; i < result.steps.length; i++) {
        expect(result.steps[i].input).toBeCloseTo(
          result.steps[i - 1].average,
          5,
        );
      }
    });

    it("should return all-zero averages when roll is below hit threshold", async () => {
      mockRoll(1);

      const result = await service.runSimulation(
        basicWeaponProfile,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(0);
      expect(result.steps[2].average).toBe(0);
      expect(result.averageDamage).toBe(0);
      expect(result.averageModelsSlain).toBe(0);
    });

    it("should return 1 model slain when all rolls are 6 and save is impossible", async () => {
      mockRoll(6);
      // ap: 3 → saveThreshold = max(2, 4+3) = 7 → roll 6 < 7 → fails save always
      const result = await service.runSimulation(
        { ...basicWeaponProfile, ap: 3 },
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[0].average).toBe(1); // attacks
      expect(result.steps[1].average).toBe(1); // hits
      expect(result.steps[2].average).toBe(1); // wounds
      expect(result.steps[3].average).toBe(1); // unsaved
      expect(result.averageDamage).toBe(1);
      expect(result.averageModelsSlain).toBe(1);
    });

    it("should auto-hit all attacks when weapon has TORRENT regardless of roll", async () => {
      mockRoll(1); // roll 1 would miss normally
      const torrent: WeaponProfile = {
        ...basicWeaponProfile,
        attacks: 3,
        ap: 3,
        abilities: [{ type: "TORRENT" }],
      };

      const result = await service.runSimulation(
        torrent,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      // TORRENT auto-hits. Roll 1 wounds? S4 vs T4 → wound on 4+; roll 1 < 4 → no wound.
      expect(result.steps[0].average).toBe(3); // attacks
      expect(result.steps[1].average).toBe(3); // auto-hits
      expect(result.steps[2].average).toBe(0); // wound roll fails (1 < 4)
    });

    it("should bypass wound roll for crit hits when weapon has LETHAL_HITS", async () => {
      mockRoll(6);
      // S1 vs T4 would normally wound on 6+, but Lethal Hits skips the wound roll
      const lethalWeapon: WeaponProfile = {
        ...basicWeaponProfile,
        attacks: 2,
        strength: 1,
        ap: 3,
        abilities: [{ type: "LETHAL_HITS" }],
      };

      const result = await service.runSimulation(
        lethalWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(2); // hits (2 crit hits)
      expect(result.steps[2].average).toBe(2); // wounds (auto-wounds from Lethal Hits, bypass wound roll)
      expect(result.steps[3].average).toBe(2); // unsaved (ap:3 → impossible save)
    });

    it("should bypass saves for crit wounds when weapon has DEVASTATING_WOUNDS", async () => {
      mockRoll(6);
      const devastatingWeapon: WeaponProfile = {
        ...basicWeaponProfile,
        attacks: 2,
        abilities: [{ type: "DEVASTATING_WOUNDS" }],
      };

      const result = await service.runSimulation(
        devastatingWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(2); // hits
      expect(result.steps[2].average).toBe(2); // wounds (all crit → mortal wounds)
      // all crit wounds bypass saves → all unsaved
      expect(result.steps[3].average).toBe(2);
    });

    it("should cap damage at remaining model wounds without spillover for normal wounds", async () => {
      mockRoll(6);
      // infantry has 1 wound, weapon does 3 damage
      const heavyWeapon: WeaponProfile = {
        ...basicWeaponProfile,
        ap: 3,
        damage: 3,
      };

      const result = await service.runSimulation(
        heavyWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[3].average).toBe(1); // unsaved wounds
      expect(result.averageDamage).toBe(1); // capped at 1 (model has 1 wound), not 3
      expect(result.averageModelsSlain).toBe(1);
    });

    it("should spill damage across model boundaries for mortal wounds", async () => {
      mockRoll(6);
      // 10-wound tank, 2 attacks of 5 damage
      const multiDmg: WeaponProfile = {
        ...basicWeaponProfile,
        attacks: 2,
        ap: 5,
        damage: 5,
        strength: 10,
        abilities: [{ type: "DEVASTATING_WOUNDS" }],
      };

      const result = await service.runSimulation(
        multiDmg,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        tankProfile,
        1,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      // mortal wounds spill → 5+5=10 damage → 1 model slain (tank has 10 wounds)
      expect(result.averageDamage).toBe(10);
      expect(result.averageModelsSlain).toBe(1);
    });

    it("should grant +1 to save when defender is in cover", async () => {
      // roll 3: hits (3 >= skill 3), wounds (S8 vs T4 → 3+, roll 3 >=3), fails save without cover (4+, roll 3 < 4)
      rng.dice.mockReturnValue(3);
      rng.dice.mockImplementation((expr: DiceExpression) =>
        typeof expr === "number" ? expr : 3,
      );
      const highStrWeapon: WeaponProfile = {
        ...basicWeaponProfile,
        strength: 8,
        ap: 0,
      };

      const noCover = await service.runSimulation(
        highStrWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      const withCover = await service.runSimulation(
        highStrWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        { inCover: true },
        1,
      );

      expect(noCover.steps[1].average).toBe(1); // hits
      expect(noCover.steps[3].average).toBe(1); // unsaved (roll 3 < save threshold 4)
      expect(withCover.steps[1].average).toBe(1); // hits
      expect(withCover.steps[3].average).toBe(0); // saved by cover (threshold becomes 3, roll 3 >= 3)
    });

    it("should apply ANTI crit wound threshold when defender has matching keyword", async () => {
      mockRoll(6);
      const antiWeapon: WeaponProfile = {
        ...basicWeaponProfile,
        attacks: 2,
        strength: 4,
        ap: 3,
        abilities: [
          { type: "ANTI", keyword: "VEHICLE", threshold: 4 },
          { type: "DEVASTATING_WOUNDS" },
        ],
      };
      const vehicle = getMockUnitProfile({
        toughness: 8,
        save: 2,
        wounds: 1,
        keywords: ["VEHICLE"],
      });

      const result = await service.runSimulation(
        antiWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        vehicle,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(2); // hits
      expect(result.steps[2].average).toBe(2); // wounds (via Anti 4+ crit threshold)
      expect(result.steps[3].average).toBe(2); // unsaved (Devastating Wounds bypass 2+ save)
    });

    it("should resolve DiceExpression strength to determine wound threshold", async () => {
      mockRoll(6);
      // strength: "D6", alwaysRoll(6) → dice("D6") = 6. S6 vs T4 → wound on 3+
      const diceStrengthWeapon: WeaponProfile = {
        ...basicWeaponProfile,
        strength: "D6",
        ap: 10,
      };

      const result = await service.runSimulation(
        diceStrengthWeapon,
        1,
        DEFAULT_ATTACKER_CONTEXT,
        infantryProfile,
        10,
        DEFAULT_DEFENDER_CONTEXT,
        1,
      );

      expect(result.steps[1].average).toBe(1); // hits
      expect(result.steps[2].average).toBe(1); // wounds (S6 vs T4 → wound on 3+, roll 6 ≥ 3)
      expect(result.steps[3].average).toBe(1); // unsaved (ap:10 → impossible save)
    });
  });
});
