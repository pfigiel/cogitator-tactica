import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { ParsePromptService } from "./parse-prompt.service";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";
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
  shootingWeapons: [
    {
      id: "w1",
      name: "Bolt Rifle",
      attacks: 2,
      skill: 3,
      strength: 4,
      ap: -1,
      damage: 1,
      abilities: [],
    },
  ],
  meleeWeapons: [
    {
      id: "w2",
      name: "Close Combat Weapon",
      attacks: 3,
      skill: 3,
      strength: 3,
      ap: 0,
      damage: 1,
      abilities: [],
    },
  ],
});

describe("ParsePromptService", () => {
  let service: ParsePromptService;
  let contextExtractionService: ContextExtractionService;
  let unitResolutionService: UnitResolutionService;
  let weaponResolutionService: WeaponResolutionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsePromptService,
        {
          provide: ContextExtractionService,
          useValue: { extract: vi.fn() },
        },
        {
          provide: UnitResolutionService,
          useValue: { resolve: vi.fn() },
        },
        {
          provide: WeaponResolutionService,
          useValue: { resolve: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ParsePromptService>(ParsePromptService);
    contextExtractionService = module.get<ContextExtractionService>(
      ContextExtractionService,
    );
    unitResolutionService = module.get<UnitResolutionService>(
      UnitResolutionService,
    );
    weaponResolutionService = module.get<WeaponResolutionService>(
      WeaponResolutionService,
    );
  });

  describe("parse", () => {
    it("should return CombatFormState with default weapons when no weapon hints are present", async () => {
      const ctx = makeCtx();
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
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
      const ctx = makeCtx();
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      const weaponResolve = vi.spyOn(weaponResolutionService, "resolve");

      await service.parse("some prompt");

      expect(weaponResolve).not.toHaveBeenCalled();
    });

    it("should call WeaponResolutionService and use its result when attacker weapon hints are present", async () => {
      const ctx = makeCtx({ attackerWeaponHints: [{ name: "Bolt Rifle" }] });
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      vi.spyOn(weaponResolutionService, "resolve").mockResolvedValue({
        attackerWeapons: [{ weaponId: "w1", modelCount: 3 }],
        defenderWeapons: [{ weaponId: "w2" }],
      });

      const result = await service.parse("some prompt");

      expect(result.attackerWeapons).toEqual([
        { weaponId: "w1", modelCount: 3 },
      ]);
      expect(result.defenderWeapons).toEqual([{ weaponId: "w2" }]);
    });

    it("should call WeaponResolutionService when only defender weapon hints are present", async () => {
      const ctx = makeCtx({ defenderWeaponHints: [{ name: "Choppa" }] });
      const attackerUnit = makeUnit("u1", "Intercessors");
      const defenderUnit = makeUnit("u2", "Boyz");

      vi.spyOn(contextExtractionService, "extract").mockResolvedValue(ctx);
      vi.spyOn(unitResolutionService, "resolve").mockResolvedValue({
        attackerUnit,
        defenderUnit,
      });
      const weaponResolve = vi
        .spyOn(weaponResolutionService, "resolve")
        .mockResolvedValue({
          attackerWeapons: [{ weaponId: "w1" }],
          defenderWeapons: [{ weaponId: "w2" }],
        });

      await service.parse("some prompt");

      expect(weaponResolve).toHaveBeenCalled();
    });
  });
});
