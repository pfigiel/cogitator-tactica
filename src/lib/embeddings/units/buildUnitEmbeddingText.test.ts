import { describe, it, expect } from "vitest";
import { buildUnitEmbeddingText } from "./buildUnitEmbeddingText";

describe("buildUnitEmbeddingText", () => {
  it("includes all fields when all are provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Intercessor Squad",
      faction: "Space Marines",
      meleeWeapons: ["Astartes chainsword", "Close combat weapon"],
      rangedWeapons: ["Bolt rifle", "Grenade Launcher"],
    });
    expect(result).toBe(
      "Unit: Intercessor Squad\nFaction: Space Marines\nMelee weapons: Astartes chainsword, Close combat weapon\nRanged weapons: Bolt rifle, Grenade Launcher",
    );
  });

  it("omits faction line when faction is not provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Intercessor Squad",
      rangedWeapons: ["Bolt rifle"],
    });
    expect(result).toBe("Unit: Intercessor Squad\nRanged weapons: Bolt rifle");
  });

  it("omits weapons sections when arrays are empty", () => {
    const result = buildUnitEmbeddingText({
      name: "Intercessor Squad",
      faction: "Space Marines",
      meleeWeapons: [],
      rangedWeapons: [],
    });
    expect(result).toBe("Unit: Intercessor Squad\nFaction: Space Marines");
  });

  it("omits weapons sections when arrays are undefined", () => {
    const result = buildUnitEmbeddingText({ name: "Ork Boyz" });
    expect(result).toBe("Unit: Ork Boyz");
  });

  it("includes only ranged weapons when only ranged provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Ork Boyz",
      faction: "Orks",
      rangedWeapons: ["Shoota"],
    });
    expect(result).toBe(
      "Unit: Ork Boyz\nFaction: Orks\nRanged weapons: Shoota",
    );
  });

  it("includes only melee weapons when only melee provided", () => {
    const result = buildUnitEmbeddingText({
      name: "Ork Boyz",
      faction: "Orks",
      meleeWeapons: ["Choppa"],
    });
    expect(result).toBe("Unit: Ork Boyz\nFaction: Orks\nMelee weapons: Choppa");
  });
});
