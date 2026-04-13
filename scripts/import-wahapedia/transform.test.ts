import { describe, it, expect } from "vitest";
import { deriveWeaponId } from "./transform";

describe("deriveWeaponId", () => {
  it("returns slug of name for the first occurrence", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    expect(deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId)).toBe("bolt_rifle");
  });

  it("returns the same id when the same fingerprint is seen again (deduplication)", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp = "ranged|2|3|4|0|1";
    deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId);
    expect(deriveWeaponId("Bolt Rifle", fp, slugToFp, fpToId)).toBe("bolt_rifle");
  });

  it("appends a 6-char hex hash when same name has different stats", () => {
    const slugToFp = new Map<string, string>();
    const fpToId = new Map<string, string>();
    const fp1 = "ranged|2|3|4|0|1";
    const fp2 = "ranged|2|3|4|1|1"; // AP differs
    const id1 = deriveWeaponId("Bolt Rifle", fp1, slugToFp, fpToId);
    const id2 = deriveWeaponId("Bolt Rifle", fp2, slugToFp, fpToId);
    expect(id1).toBe("bolt_rifle");
    expect(id2).toMatch(/^bolt_rifle_[a-f0-9]{6}$/);
    expect(id1).not.toBe(id2);
  });

  it("is deterministic: same fingerprint always produces the same suffixed id", () => {
    const run = () => {
      const slugToFp = new Map<string, string>();
      const fpToId = new Map<string, string>();
      deriveWeaponId("Bolt Rifle", "ranged|2|3|4|0|1", slugToFp, fpToId);
      return deriveWeaponId("Bolt Rifle", "ranged|2|3|4|1|1", slugToFp, fpToId);
    };
    expect(run()).toBe(run());
  });
});
