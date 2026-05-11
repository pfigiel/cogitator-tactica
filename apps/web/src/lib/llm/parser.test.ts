import { describe, it, expect, vi } from "vitest";

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
  it("parses weapon hints with counts", () => {
    const json = JSON.stringify({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 10,
      defenderCount: 20,
      phase: "melee",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponHints: [{ name: "Bolt Rifle" }],
      defenderWeaponHints: [
        { name: "Choppa", count: 19 },
        { name: "Big Choppa", count: 1 },
      ],
    });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([{ name: "Bolt Rifle" }]);
    expect(result.defenderWeaponHints).toEqual([
      { name: "Choppa", count: 19 },
      { name: "Big Choppa", count: 1 },
    ]);
  });

  it("drops invalid count values (non-finite numbers)", () => {
    const json = JSON.stringify({
      attackerName: "A",
      defenderName: "B",
      attackerWeaponHints: [{ name: "Sword", count: "lots" }],
      defenderWeaponHints: [{ name: "Axe", count: null }],
    });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([{ name: "Sword" }]);
    expect(result.defenderWeaponHints).toEqual([{ name: "Axe" }]);
  });

  it("drops entries that are not objects with a string name", () => {
    const json = JSON.stringify({
      attackerName: "A",
      defenderName: "B",
      attackerWeaponHints: [{ name: "Valid" }, "bare string", 42, null],
      defenderWeaponHints: [],
    });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([{ name: "Valid" }]);
  });

  it("defaults to empty arrays when hints are absent", () => {
    const json = JSON.stringify({ attackerName: "A", defenderName: "B" });
    const result = parseContextFromJson(json);
    expect(result.attackerWeaponHints).toEqual([]);
    expect(result.defenderWeaponHints).toEqual([]);
  });

  it("parses a complete valid response", () => {
    const json = JSON.stringify({
      attackerName: "Space Marine Intercessors",
      defenderName: "Ork Boyz",
      attackerCount: 5,
      defenderCount: 10,
      phase: "shooting",
      defenderInCover: false,
      firstFighter: "attacker",
      attackerWeaponHints: [{ name: "Bolt Rifle" }],
      defenderWeaponHints: [],
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
      attackerWeaponHints: [{ name: "Bolt Rifle" }],
      defenderWeaponHints: [],
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
    expect(result.attackerWeaponHints).toEqual([]);
    expect(result.defenderWeaponHints).toEqual([]);
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

describe("parseContextFromJson faction fields", () => {
  const base = {
    attackerName: "Intercessors",
    defenderName: "Boyz",
    attackerCount: 10,
    defenderCount: 20,
    phase: "shooting",
    defenderInCover: false,
    firstFighter: "attacker",
    attackerWeaponHints: [],
    defenderWeaponHints: [],
  };

  it("parses attackerFactionId and defenderFactionId when present", () => {
    const result = parseContextFromJson(
      JSON.stringify({
        ...base,
        attackerFactionId: "SM",
        defenderFactionId: "ORK",
      }),
    );
    expect(result.attackerFactionId).toBe("SM");
    expect(result.defenderFactionId).toBe("ORK");
  });

  it("sets faction ids to undefined when LLM returns null", () => {
    const result = parseContextFromJson(
      JSON.stringify({
        ...base,
        attackerFactionId: null,
        defenderFactionId: null,
      }),
    );
    expect(result.attackerFactionId).toBeUndefined();
    expect(result.defenderFactionId).toBeUndefined();
  });

  it("sets faction ids to undefined when fields are absent", () => {
    const result = parseContextFromJson(JSON.stringify(base));
    expect(result.attackerFactionId).toBeUndefined();
    expect(result.defenderFactionId).toBeUndefined();
  });
});
