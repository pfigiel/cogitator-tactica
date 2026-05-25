import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { WeaponResolutionService } from "./weapon-resolution.service";
import { LlmService } from "../llm/llm.service";
import type { UnitProfile, WeaponProfile } from "../common/types";
import type { ParsedContext } from "./types";

const makeWeapon = (id: string, name: string): WeaponProfile => ({
  id,
  name,
  attacks: 2,
  skill: 3,
  strength: 4,
  ap: -1,
  damage: 1,
  abilities: [],
});

const makeUnit = (
  id: string,
  name: string,
  shootingWeapons: WeaponProfile[] = [],
  meleeWeapons: WeaponProfile[] = [],
): UnitProfile => ({
  id,
  name,
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons,
  meleeWeapons,
});

const makeCtx = (overrides: Partial<ParsedContext> = {}): ParsedContext => ({
  attackerName: "Intercessors",
  defenderName: "Boyz",
  attackerCount: 5,
  defenderCount: 10,
  phase: "shooting",
  defenderInCover: false,
  firstFighter: "attacker",
  attackerWeaponHints: [{ name: "Bolt Rifle" }],
  defenderWeaponHints: [],
  ...overrides,
});

describe("WeaponResolutionService", () => {
  let service: WeaponResolutionService;
  let llmService: LlmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeaponResolutionService,
        {
          provide: LlmService,
          useValue: { createMessage: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<WeaponResolutionService>(WeaponResolutionService);
    llmService = module.get<LlmService>(LlmService);
  });

  describe("resolve", () => {
    it("should return matched attacker weapon when LLM identifies it by name", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit(
        "u2",
        "Boyz",
        [],
        [makeWeapon("w2", "Choppa")],
      );

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });

    it("should set modelCount when LLM returns a specific number", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: 3 }],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([
        { weaponId: "w1", modelCount: 3 },
      ]);
    });

    it("should fall back to first attacker weapon when LLM returns unrecognized weapon name", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Unknown Weapon", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });

    it("should return first defender melee weapon as default when phase is shooting", async () => {
      const boltRifle = makeWeapon("w1", "Bolt Rifle");
      const choppa = makeWeapon("w2", "Choppa");
      const attackerUnit = makeUnit("u1", "Intercessors", [boltRifle]);
      const defenderUnit = makeUnit("u2", "Boyz", [], [choppa]);

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Bolt Rifle", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx({ phase: "shooting" }),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should resolve both attacker and defender weapons when phase is melee", async () => {
      const powerSword = makeWeapon("w1", "Power Sword");
      const choppa = makeWeapon("w2", "Choppa");
      const attackerUnit = makeUnit("u1", "Intercessors", [], [powerSword]);
      const defenderUnit = makeUnit("u2", "Boyz", [], [choppa]);

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [{ weaponName: "Power Sword", modelCount: null }],
          defenderWeapons: [{ weaponName: "Choppa", modelCount: null }],
        }),
      );

      const result = await service.resolve(
        makeCtx({ phase: "melee" }),
        attackerUnit,
        defenderUnit,
        "melee",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should throw when LLM returns no JSON object", async () => {
      const attackerUnit = makeUnit("u1", "Intercessors", [
        makeWeapon("w1", "Bolt Rifle"),
      ]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        "I cannot determine the weapons.",
      );

      await expect(
        service.resolve(makeCtx(), attackerUnit, defenderUnit, "shooting"),
      ).rejects.toThrow("No JSON object found");
    });

    it("should match weapon name case-insensitively and normalize apostrophes", async () => {
      const weapon = makeWeapon("w1", "Guardian's Spear");
      const attackerUnit = makeUnit("u1", "Custodes", [weapon]);
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerWeapons: [
            { weaponName: "guardian's spear", modelCount: null },
          ],
        }),
      );

      const result = await service.resolve(
        makeCtx(),
        attackerUnit,
        defenderUnit,
        "shooting",
      );

      expect(result.attackerWeapons).toEqual([{ weaponId: "w1" }]);
    });
  });
});
