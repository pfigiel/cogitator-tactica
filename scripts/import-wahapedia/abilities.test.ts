import { describe, it, expect } from "vitest";
import { parseAbilities } from "./abilities";

describe("parseAbilities", () => {
  describe("RAPID FIRE", () => {
    it("parses numeric value", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE 2");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: 2 }]);
    });

    it("parses D3", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D3" }]);
    });

    it("parses D6", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D6");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D6" }]);
    });

    it("parses D6+3", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D6+3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D6+3" }]);
    });

    it("parses D3+1", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D3+1");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D3+1" }]);
    });
  });

  describe("SUSTAINED HITS", () => {
    it("parses numeric value", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS 1");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: 1 }]);
    });

    it("parses D3", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS D3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D3" }]);
    });

    it("parses D6", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS D6");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D6" }]);
    });

    it("parses D6+3", () => {
      const { abilities, unknownTokens } = parseAbilities(
        "SUSTAINED HITS D6+3",
      );
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D6+3" }]);
    });

    it("parses D3+1", () => {
      const { abilities, unknownTokens } = parseAbilities(
        "SUSTAINED HITS D3+1",
      );
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D3+1" }]);
    });
  });
});
