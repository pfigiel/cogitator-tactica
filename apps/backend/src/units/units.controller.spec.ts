import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { vi } from "vitest";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

describe("UnitsController", () => {
  let controller: UnitsController;
  let unitsService: UnitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [
        {
          provide: UnitsService,
          useValue: {
            listUnits: vi.fn(),
            getUnit: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UnitsController>(UnitsController);
    unitsService = module.get<UnitsService>(UnitsService);
  });

  describe("listUnits", () => {
    it("should return units array when GET /units is called", async () => {
      const units = [{ id: "unit-1", name: "Intercessors" }];
      vi.spyOn(unitsService, "listUnits").mockResolvedValue(units);

      const result = await controller.listUnits();

      expect(result).toEqual(units);
    });
  });

  describe("getUnit", () => {
    it("should return unit profile when unit exists", async () => {
      const profile = {
        id: "unit-1",
        name: "Intercessors",
        toughness: 4,
        save: 3,
        wounds: 2,
        keywords: ["Infantry"],
        shootingWeapons: [],
        meleeWeapons: [],
      };
      vi.spyOn(unitsService, "getUnit").mockResolvedValue(profile);

      const result = await controller.getUnit("unit-1");

      expect(result).toEqual(profile);
      expect(unitsService.getUnit).toHaveBeenCalledWith("unit-1");
    });

    it("should throw NotFoundException when unit does not exist", async () => {
      vi.spyOn(unitsService, "getUnit").mockResolvedValue(null);

      await expect(controller.getUnit("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
