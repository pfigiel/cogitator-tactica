import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { WeaponResolutionService } from "./weapon-resolution.service";
import { LlmService } from "../llm/llm.service";
import { getMockUnitProfile, getMockWeaponProfile } from "../common/test/mocks";
import { getMockParsedContext } from "./test/mocks";
import { getMockProvider } from "../common/test/utils";

describe("WeaponResolutionService", () => {
  let service: WeaponResolutionService;
  let llmService: MockProxy<LlmService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeaponResolutionService, getMockProvider(LlmService)],
    }).compile();

    service = module.get<WeaponResolutionService>(WeaponResolutionService);
    llmService = module.get<MockProxy<LlmService>>(LlmService);
  });

  describe("resolve", () => {
    it("should return matched attacker weapon when LLM identifies it by name", async () => {
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        shootingWeapons: [boltRifle],
      });
      const defenderUnit = getMockUnitProfile({
        id: "u2",
        name: "Boyz",
        meleeWeapons: [getMockWeaponProfile({ id: "w2", name: "Choppa" })],
      });

      llmService.createMessage.mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        getMockParsedContext({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });

    it("should set modelCount when LLM returns a specific number", async () => {
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        shootingWeapons: [boltRifle],
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      llmService.createMessage.mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: 3 }],
        }),
      );

      const result = await service.resolve(
        getMockParsedContext({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([
        { weaponId: "w1", modelCount: 3 },
      ]);
    });

    it("should fall back to first attacker weapon when LLM returns unrecognized weapon name", async () => {
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        shootingWeapons: [boltRifle],
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      llmService.createMessage.mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Unknown Weapon", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        getMockParsedContext({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });

    it("should return first defender melee weapon as default when phase is shooting", async () => {
      const boltRifle = getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" });
      const choppa = getMockWeaponProfile({ id: "w2", name: "Choppa" });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        shootingWeapons: [boltRifle],
      });
      const defenderUnit = getMockUnitProfile({
        id: "u2",
        name: "Boyz",
        meleeWeapons: [choppa],
      });

      llmService.createMessage.mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        getMockParsedContext({
          attackerWeaponHints: [{ name: "Bolt Rifle" }],
          phase: "shooting",
        }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should resolve both attacker and defender weapons when phase is melee", async () => {
      const powerSword = getMockWeaponProfile({
        id: "w1",
        name: "Power Sword",
      });
      const choppa = getMockWeaponProfile({ id: "w2", name: "Choppa" });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        meleeWeapons: [powerSword],
      });
      const defenderUnit = getMockUnitProfile({
        id: "u2",
        name: "Boyz",
        meleeWeapons: [choppa],
      });

      llmService.createMessage.mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Power Sword", modelCount: null }],
          defenderWeapons: [{ weaponName: "Choppa", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        getMockParsedContext({
          attackerWeaponHints: [{ name: "Bolt Rifle" }],
          phase: "melee",
        }),
        attackerUnit,
        defenderUnit,
        "melee",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should throw when LLM returns no JSON object", async () => {
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Intercessors",
        shootingWeapons: [
          getMockWeaponProfile({ id: "w1", name: "Bolt Rifle" }),
        ],
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      llmService.createMessage.mockResolvedValue(
        "I cannot determine the weapons.",
      );

      await expect(
        service.resolve(
          getMockParsedContext({
            attackerWeaponHints: [{ name: "Bolt Rifle" }],
          }),
          attackerUnit,
          defenderUnit,
          "shooting",
        ),
      ).rejects.toThrow("No JSON object found");
    });

    it("should match weapon name case-insensitively and normalize apostrophes", async () => {
      const weapon = getMockWeaponProfile({
        id: "w1",
        name: "Guardian's Spear",
      });
      const attackerUnit = getMockUnitProfile({
        id: "u1",
        name: "Custodes",
        shootingWeapons: [weapon],
      });
      const defenderUnit = getMockUnitProfile({ id: "u2", name: "Boyz" });

      llmService.createMessage.mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [
            { weaponName: "guardian's spear", modelCount: null },
          ],
        }),
      );

      const result = await service.resolve(
        getMockParsedContext({ attackerWeaponHints: [{ name: "Bolt Rifle" }] }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });
  });
});
