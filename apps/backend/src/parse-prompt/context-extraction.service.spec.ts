import { Test, TestingModule } from "@nestjs/testing";
import { vi } from "vitest";
import { ContextExtractionService } from "./context-extraction.service";
import { LlmService } from "../llm/llm.service";
import { FactionsService } from "../units/factions.service";

describe("ContextExtractionService", () => {
  let service: ContextExtractionService;
  let llmService: LlmService;
  let factionsService: FactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextExtractionService,
        {
          provide: LlmService,
          useValue: { createMessage: vi.fn() },
        },
        {
          provide: FactionsService,
          useValue: { getAllFactions: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ContextExtractionService>(ContextExtractionService);
    llmService = module.get<LlmService>(LlmService);
    factionsService = module.get<FactionsService>(FactionsService);
  });

  describe("extract", () => {
    it("should return ParsedContext when LLM returns valid JSON", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([
        { id: "f1", name: "Space Marines" },
      ]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerName: "Intercessors",
          defenderName: "Boyz",
          attackerCount: 5,
          defenderCount: 10,
          phase: "shooting",
          defenderInCover: false,
          firstFighter: "attacker",
          attackerWeaponHints: [],
          defenderWeaponHints: [],
          attackerFactionId: null,
          defenderFactionId: null,
        }),
      );

      const result = await service.extract("5 Intercessors shoot 10 Boyz");

      expect(result).toMatchObject({
        attackerName: "Intercessors",
        defenderName: "Boyz",
        attackerCount: 5,
        defenderCount: 10,
        phase: "shooting",
        defenderInCover: false,
        firstFighter: "attacker",
        attackerWeaponHints: [],
        defenderWeaponHints: [],
        attackerFactionId: undefined,
        defenderFactionId: undefined,
      });
    });

    it("should pass factions context and prompt to LlmService when extract is called", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([
        { id: "f1", name: "Space Marines" },
      ]);
      const createMessage = vi
        .spyOn(llmService, "createMessage")
        .mockResolvedValue(
          JSON.stringify({
            attackerName: "A",
            defenderName: "B",
            attackerCount: 1,
            defenderCount: 1,
            phase: "shooting",
            defenderInCover: false,
            firstFighter: "attacker",
            attackerWeaponHints: [],
            defenderWeaponHints: [],
            attackerFactionId: null,
            defenderFactionId: null,
          }),
        );

      await service.extract("A vs B");

      expect(createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "haiku",
          message: "A vs B",
          system: expect.stringContaining("Space Marines"),
        }),
      );
    });

    it("should parse weapon hints when LLM returns weapon arrays", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerName: "Intercessors",
          defenderName: "Boyz",
          attackerCount: 5,
          defenderCount: 10,
          phase: "shooting",
          defenderInCover: false,
          firstFighter: "attacker",
          attackerWeaponHints: [{ name: "Bolt Rifle", count: 3 }],
          defenderWeaponHints: [{ name: "Choppa" }],
          attackerFactionId: null,
          defenderFactionId: null,
        }),
      );

      const result = await service.extract("some prompt");

      expect(result.attackerWeaponHints).toEqual([
        { name: "Bolt Rifle", count: 3 },
      ]);
      expect(result.defenderWeaponHints).toEqual([{ name: "Choppa" }]);
    });

    it("should throw when LLM returns response without attackerName", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({ defenderName: "Boyz" }),
      );

      await expect(service.extract("bad prompt")).rejects.toThrow(
        "Missing required fields",
      );
    });

    it("should throw when LLM returns response with no JSON object", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        "Sorry, I cannot help with that.",
      );

      await expect(service.extract("bad prompt")).rejects.toThrow(
        "No JSON object found",
      );
    });

    it("should default phase to shooting when LLM returns unknown phase value", async () => {
      vi.spyOn(factionsService, "getAllFactions").mockResolvedValue([]);
      vi.spyOn(llmService, "createMessage").mockResolvedValue(
        JSON.stringify({
          attackerName: "A",
          defenderName: "B",
          attackerCount: 1,
          defenderCount: 1,
          phase: "unknown",
          defenderInCover: false,
          firstFighter: "attacker",
          attackerWeaponHints: [],
          defenderWeaponHints: [],
          attackerFactionId: null,
          defenderFactionId: null,
        }),
      );

      const result = await service.extract("A vs B");

      expect(result.phase).toBe("shooting");
    });
  });
});
