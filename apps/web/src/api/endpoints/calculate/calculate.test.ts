import { setupServer } from "msw/node";
import { calculate as calculateHandler } from "../../tests/handlers/calculate";
import { calculate } from "./calculate";
import type { CombatInput, CombatResult } from "@/lib/calculator/types";

const mockInput: CombatInput = {
  phase: "shooting",
  attacker: {
    unit: {
      id: "unit-1",
      name: "Intercessors",
      toughness: 4,
      save: 3,
      wounds: 2,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 10,
    selectedWeapons: [],
  },
  defender: {
    unit: {
      id: "unit-2",
      name: "Ork Boyz",
      toughness: 4,
      save: 6,
      wounds: 1,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 20,
    selectedWeapons: [],
  },
};

const mockResult: Partial<CombatResult> = {
  phase: "shooting",
  primary: {
    attackerName: "Intercessors (10)",
    defenderName: "Ork Boyz",
    weaponResults: [],
    totalAverageDamage: 5,
    totalAverageModelsSlain: 5,
  },
};

const server = setupServer(calculateHandler.success({ data: mockResult }));

describe("calculate", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return combat result when response is ok", async () => {
    const result = await calculate(mockInput);
    expect(result).toEqual(mockResult);
  });

  it("should throw when response is not ok", async () => {
    server.use(calculateHandler.error());
    await expect(calculate(mockInput)).rejects.toThrow("Failed to calculate");
  });
});
