import { describe, it, expect } from "vitest";
import { runSimulation } from "@/lib/calculator/simulation/runner";
import { Rng } from "@/lib/calculator/simulation/rng";
import { DEFAULT_ATTACKER_CONTEXT, DEFAULT_DEFENDER_CONTEXT, UnitProfile, WeaponProfile } from "@/lib/calculator/types";

// Deterministic RNG: always returns `value`
function alwaysRoll(value: number): Rng {
  return {
    d6: () => value,
    dice: (expr) => {
      if (typeof expr === "number") return expr;
      const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
      const count = match[1] ? parseInt(match[1], 10) : 1;
      const modifier = match[3] ? parseInt(match[3], 10) : 0;
      return count * value + modifier;
    },
  };
}

const infantry: UnitProfile = {
  id: "infantry", name: "Infantry",
  toughness: 4, save: 4, wounds: 1, keywords: [],
  shootingWeapons: [], meleeWeapons: [],
};

const bolter: WeaponProfile = {
  name: "Bolter", attacks: 1, skill: 3, strength: 4, ap: 3, damage: 1, abilities: [],
};

describe("runSimulation", () => {
  it("returns a WeaponResult with the correct weapon name and model count", async () => {
    const result = await runSimulation(
      alwaysRoll(6), bolter, 2, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.weaponName).toBe("Bolter");
    expect(result.modelCount).toBe(2);
  });

  it("returns 6 steps with correct labels", async () => {
    const result = await runSimulation(
      alwaysRoll(6), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    const labels = result.steps.map((s) => s.label);
    expect(labels).toEqual(["Attacks", "Hits", "Wounds", "Unsaved Wounds", "Damage", "Models Slain"]);
  });

  it("with a deterministic RNG, all N runs are identical so averages equal a single run", async () => {
    // alwaysRoll(6): every roll is 6 → deterministic outcome
    // 1 model, 1 attack per model → 1 attack, hits (3+), wounds (4+), fails save (AP3 → save 7+ → always fail)
    // damage 1, slays 1 infantry
    const result = await runSimulation(
      alwaysRoll(6), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.steps[0].average).toBe(1);   // attacks
    expect(result.steps[1].average).toBe(1);   // hits
    expect(result.steps[2].average).toBe(1);   // wounds
    expect(result.steps[3].average).toBe(1);   // unsaved wounds
    expect(result.steps[4].average).toBe(1);   // damage
    expect(result.steps[5].average).toBe(1);   // models slain
    expect(result.averageDamage).toBe(1);
    expect(result.averageModelsSlain).toBe(1);
  });

  it("step[n].input equals step[n-1].average", async () => {
    const result = await runSimulation(
      alwaysRoll(6), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i].input).toBeCloseTo(result.steps[i - 1].average, 5);
    }
  });

  it("with alwaysRoll(1): no hits → all subsequent averages are 0", async () => {
    const result = await runSimulation(
      alwaysRoll(1), bolter, 1, DEFAULT_ATTACKER_CONTEXT,
      infantry, 10, DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.steps[1].average).toBe(0); // hits
    expect(result.steps[2].average).toBe(0); // wounds
    expect(result.averageDamage).toBe(0);
    expect(result.averageModelsSlain).toBe(0);
  });
});
