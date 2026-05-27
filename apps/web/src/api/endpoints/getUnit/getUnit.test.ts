import { setupServer } from "msw/node";
import { units } from "../../tests/handlers/units";
import { getUnit } from "./getUnit";
import type { UnitProfile } from "@/lib/calculator/types";

const mockUnit: UnitProfile = {
  id: "unit-1",
  name: "Intercessors",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["INFANTRY"],
  shootingWeapons: [],
  meleeWeapons: [],
};

const server = setupServer(units.getUnit.success({ data: mockUnit }));

describe("getUnit", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return unit profile when response is ok", async () => {
    const result = await getUnit("unit-1");
    expect(result).toEqual(mockUnit);
  });

  it("should throw when response is not ok", async () => {
    server.use(units.getUnit.error());
    await expect(getUnit("unit-1")).rejects.toThrow("Failed to fetch unit");
  });
});
