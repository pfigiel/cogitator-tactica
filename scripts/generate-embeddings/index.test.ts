import { describe, it, expect } from "vitest";
import { buildUnitEmbeddingText } from "./index";

describe("buildUnitEmbeddingText", () => {
  it("combines name, keywords, and weapon names into a single string", () => {
    const result = buildUnitEmbeddingText({
      name: "Space Marine Intercessors",
      keywords: ["INFANTRY", "ADEPTUS ASTARTES"],
      weapons: ["Bolt Rifle", "Bolt Pistol"],
    });
    expect(result).toBe(
      "Space Marine Intercessors INFANTRY ADEPTUS ASTARTES Bolt Rifle Bolt Pistol",
    );
  });

  it("handles a unit with no keywords", () => {
    const result = buildUnitEmbeddingText({
      name: "Test Unit",
      keywords: [],
      weapons: ["Chainsword"],
    });
    expect(result).toBe("Test Unit Chainsword");
  });

  it("handles a unit with no weapons", () => {
    const result = buildUnitEmbeddingText({
      name: "Test Unit",
      keywords: ["INFANTRY"],
      weapons: [],
    });
    expect(result).toBe("Test Unit INFANTRY");
  });
});
