import { describe, it, expect, vi } from "vitest";

// Mock transitive deps that have ESM directory-import issues in Vitest
vi.mock("@/lib/embeddings/common/voyage", () => ({
  embedText: vi.fn(),
  embedTexts: vi.fn(),
}));
vi.mock("@/lib/db/units", () => ({
  getUnit: vi.fn(),
  searchUnitsByEmbedding: vi.fn(),
}));

import { parseContextFromJson } from "./parser";

describe("parseContextFromJson", () => {
  it("parses a complete valid response", () => {
    const json = JSON.stringify({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 5,
      defenderCount: 10,
      phase: "shooting",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponNames: ["Bolt Rifle"],
      defenderWeaponNames: [],
    });
    const result = parseContextFromJson(json);
    expect(result).toEqual({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 5,
      defenderCount: 10,
      phase: "shooting",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponNames: ["Bolt Rifle"],
      defenderWeaponNames: [],
    });
  });

  it("applies defaults for missing optional fields", () => {
    const json = JSON.stringify({
      attackerName: "Intercessors",
      defenderName: "Boyz",
    });
    const result = parseContextFromJson(json);
    expect(result.phase).toBe("shooting");
    expect(result.attackerCount).toBe(1);
    expect(result.defenderCount).toBe(1);
    expect(result.defenderInCover).toBe(false);
    expect(result.firstFighter).toBe("attacker");
    expect(result.attackerWeaponNames).toEqual([]);
    expect(result.defenderWeaponNames).toEqual([]);
  });

  it("throws if attackerName or defenderName is missing", () => {
    expect(() =>
      parseContextFromJson(JSON.stringify({ attackerName: "A" })),
    ).toThrow();
    expect(() =>
      parseContextFromJson(JSON.stringify({ defenderName: "B" })),
    ).toThrow();
  });

  it("clamps counts to a minimum of 1", () => {
    const json = JSON.stringify({
      attackerName: "A",
      defenderName: "B",
      attackerCount: 0,
      defenderCount: -3,
    });
    const result = parseContextFromJson(json);
    expect(result.attackerCount).toBe(1);
    expect(result.defenderCount).toBe(1);
  });
});
