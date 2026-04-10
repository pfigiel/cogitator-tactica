import { describe, it, expect } from "vitest";
import { formatAbilityLabel, formatAbilities, formatStats } from "./weaponFormatters";
import type { WeaponAbility, WeaponProfile } from "@/lib/calculator/types";

describe("formatAbilityLabel", () => {
  it("formats ANTI ability", () => {
    const ability: WeaponAbility = { type: "ANTI", keyword: "VEHICLE", threshold: 4 };
    expect(formatAbilityLabel(ability)).toBe("Anti-VEHICLE 4+");
  });

  it("formats MELTA ability with value", () => {
    const ability: WeaponAbility = { type: "MELTA", value: 2 };
    expect(formatAbilityLabel(ability)).toBe("Melta 2");
  });

  it("formats RAPID_FIRE ability with value", () => {
    const ability: WeaponAbility = { type: "RAPID_FIRE", value: 1 };
    expect(formatAbilityLabel(ability)).toBe("Rapid Fire 1");
  });

  it("formats SUSTAINED_HITS ability with value", () => {
    const ability: WeaponAbility = { type: "SUSTAINED_HITS", value: 3 };
    expect(formatAbilityLabel(ability)).toBe("Sustained Hits 3");
  });

  it("formats TWIN_LINKED ability", () => {
    const ability: WeaponAbility = { type: "TWIN_LINKED" };
    expect(formatAbilityLabel(ability)).toBe("Twin-linked");
  });

  it("formats DEVASTATING_WOUNDS ability", () => {
    const ability: WeaponAbility = { type: "DEVASTATING_WOUNDS" };
    expect(formatAbilityLabel(ability)).toBe("Devastating Wounds");
  });

  it("formats IGNORES_COVER ability", () => {
    const ability: WeaponAbility = { type: "IGNORES_COVER" };
    expect(formatAbilityLabel(ability)).toBe("Ignores Cover");
  });
});

describe("formatAbilities", () => {
  it("returns empty string for empty abilities array", () => {
    expect(formatAbilities([])).toBe("");
  });

  it("returns single ability label for one ability", () => {
    expect(formatAbilities([{ type: "LETHAL_HITS" }])).toBe("Lethal Hits");
  });

  it("returns comma-separated labels for multiple abilities", () => {
    expect(
      formatAbilities([{ type: "LETHAL_HITS" }, { type: "TWIN_LINKED" }])
    ).toBe("Lethal Hits, Twin-linked");
  });
});

describe("formatStats", () => {
  const weapon: WeaponProfile = {
    name: "Bolter",
    attacks: 2,
    skill: 3,
    strength: 4,
    ap: 1,
    damage: 1,
    abilities: [],
  };

  it("uses BS label for shooting weapons", () => {
    const stats = formatStats(weapon, "shooting");
    expect(stats[0]).toEqual({ label: "BS", value: "3+" });
  });

  it("uses WS label for melee weapons", () => {
    const stats = formatStats(weapon, "melee");
    expect(stats[0]).toEqual({ label: "WS", value: "3+" });
  });

  it("formats all stats in correct order", () => {
    expect(formatStats(weapon, "shooting")).toEqual([
      { label: "BS", value: "3+" },
      { label: "A", value: "2" },
      { label: "S", value: "4" },
      { label: "AP-", value: "1" },
      { label: "D", value: "1" },
    ]);
  });

  it("shows AP-0 when ap is 0", () => {
    const stats = formatStats({ ...weapon, ap: 0 }, "shooting");
    expect(stats[3]).toEqual({ label: "AP-", value: "0" });
  });

  it("formats dice expression attacks as string", () => {
    const stats = formatStats({ ...weapon, attacks: "D6" }, "shooting");
    expect(stats[1]).toEqual({ label: "A", value: "D6" });
  });
});
