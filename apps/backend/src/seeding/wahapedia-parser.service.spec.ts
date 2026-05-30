import { describe, it, expect } from "vitest";
import {
  parseAbilities,
  deriveWeaponId,
  parseLoadoutDefaults,
} from "./wahapedia-parser.service";

describe("parseAbilities", () => {
  describe("RAPID FIRE", () => {
    it("should parse numeric value when parseAbilities is called with RAPID FIRE 2", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE 2");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: 2 }]);
    });

    it("should parse D3 when parseAbilities is called with RAPID FIRE D3", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D3" }]);
    });

    it("should parse D6 when parseAbilities is called with RAPID FIRE D6", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D6");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D6" }]);
    });

    it("should parse D6+3 when parseAbilities is called with RAPID FIRE D6+3", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D6+3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D6+3" }]);
    });

    it("should parse D3+1 when parseAbilities is called with RAPID FIRE D3+1", () => {
      const { abilities, unknownTokens } = parseAbilities("RAPID FIRE D3+1");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "RAPID_FIRE", value: "D3+1" }]);
    });
  });

  describe("SUSTAINED HITS", () => {
    it("should parse numeric value when parseAbilities is called with SUSTAINED HITS 1", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS 1");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: 1 }]);
    });

    it("should parse D3 when parseAbilities is called with SUSTAINED HITS D3", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS D3");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D3" }]);
    });

    it("should parse D6 when parseAbilities is called with SUSTAINED HITS D6", () => {
      const { abilities, unknownTokens } = parseAbilities("SUSTAINED HITS D6");
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D6" }]);
    });

    it("should parse D6+3 when parseAbilities is called with SUSTAINED HITS D6+3", () => {
      const { abilities, unknownTokens } = parseAbilities(
        "SUSTAINED HITS D6+3",
      );
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D6+3" }]);
    });

    it("should parse D3+1 when parseAbilities is called with SUSTAINED HITS D3+1", () => {
      const { abilities, unknownTokens } = parseAbilities(
        "SUSTAINED HITS D3+1",
      );
      expect(unknownTokens).toEqual([]);
      expect(abilities).toEqual([{ type: "SUSTAINED_HITS", value: "D3+1" }]);
    });
  });
});

describe("deriveWeaponId", () => {
  it("should return slug of name for first occurrence when deriveWeaponId is called", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    expect(
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId),
    ).toBe("bolt_rifle");
  });

  it("should return same id when same fingerprint is seen again when deriveWeaponId is called", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp = "ranged|2|3|4|0|1";
    deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId);
    expect(deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId)).toBe(
      "bolt_rifle",
    );
  });

  it("should append 6-char hex hash when same name has different stats when deriveWeaponId is called", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp1 = "ranged|2|3|4|0|1";
    const fp2 = "ranged|2|3|4|1|1";
    const id1 = deriveWeaponId("Bolt Rifle", fp1, slugToFp, fpToId);
    const id2 = deriveWeaponId("Bolt Rifle", fp2, slugToFp, fpToId);
    expect(id1).toBe("bolt_rifle");
    expect(id2).toMatch(/^bolt_rifle_[a-f0-9]{6}$/);
    expect(id1).not.toBe(id2);
  });

  it("should be deterministic when deriveWeaponId is called with same inputs", () => {
    const run = () => {
      const slugToFp = new Map<string, string>();
      const fpToId = new Map<string, string>();
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId);
      return deriveWeaponId("Bolt Rifle", "ranged|2|3|4|1|1", slugToFp, fpToId);
    };
    expect(run()).toBe(run());
  });
});

describe("parseLoadoutDefaults", () => {
  it("should return __all__ key with weapon names when loadout has single-model format", () => {
    const result = parseLoadoutDefaults(
      "<b>This model is equipped with:</b> kombi-weapon; twin slugga; big choppa.",
      ["WARBOSS"],
    );
    expect(result.get("__all__")).toEqual([
      "kombi-weapon",
      "twin slugga",
      "big choppa",
    ]);
  });

  it("should return __all__ key when loadout uses every model format", () => {
    const result = parseLoadoutDefaults(
      "<b>Every model is equipped with:</b> bolt pistol; boltgun; close combat weapon.",
      ["INTERCESSOR"],
    );
    expect(result.get("__all__")).toEqual([
      "bolt pistol",
      "boltgun",
      "close combat weapon",
    ]);
  });

  it("should return per-model keys when loadout has multi-model format", () => {
    const result = parseLoadoutDefaults(
      "<b>The Boss Nob is equipped with:</b> slugga; big choppa. <br><br><b>Every Boy is equipped with:</b> slugga; choppa.",
      ["BOY", "BOSS NOB"],
    );
    expect(result.get("boss nob")).toEqual(["slugga", "big choppa"]);
    expect(result.get("boy")).toEqual(["slugga", "choppa"]);
  });

  it("should return empty map when loadout is empty string", () => {
    const result = parseLoadoutDefaults("", ["MODEL"]);
    expect(result.size).toBe(0);
  });

  it("should strip italic footnotes before parsing weapon names", () => {
    const result = parseLoadoutDefaults(
      "<b>This model is equipped with:</b> bolt pistol; boltgun<i>*</i>; close combat weapon.",
      ["MARINE"],
    );
    expect(result.get("__all__")).toEqual([
      "bolt pistol",
      "boltgun",
      "close combat weapon",
    ]);
  });
});
