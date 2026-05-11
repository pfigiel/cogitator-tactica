import { describe, it, expect } from "vitest";
import {
  DEFAULT_DEFENDER_CONTEXT,
  DEFAULT_ATTACKER_CONTEXT,
  UnitProfile,
  WeaponProfile,
} from "@/lib/calculator/types";
import { simulateWeaponOnce } from "@/lib/calculator/simulation/pipeline";
import { Rng } from "@/lib/calculator/simulation/rng";

const alwaysRoll = (value: number): Rng => ({
  d6: () => value,
  dice: (expr) => {
    if (typeof expr === "number") return expr;
    const match = expr.match(/^(\d+)?D(3|6)([+-]\d+)?$/i)!;
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    return count * value + modifier;
  },
});

const infantry: UnitProfile = {
  id: "infantry",
  name: "Infantry",
  toughness: 4,
  save: 4,
  wounds: 1,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
};

const tankProfile: UnitProfile = {
  id: "tank",
  name: "Tank",
  toughness: 8,
  save: 2,
  wounds: 10,
  keywords: ["VEHICLE"],
  shootingWeapons: [],
  meleeWeapons: [],
};

const basicWeapon: WeaponProfile = {
  id: "bolter",
  name: "Bolter",
  attacks: 1,
  skill: 3,
  strength: 4,
  ap: 0,
  damage: 1,
  abilities: [],
};

describe("simulateWeaponOnce", () => {
  it("all rolls of 6: 1 model scores 1 attack, hits, wounds, fails save, deals 1 damage, slays 1 model", () => {
    // S4 vs T4 → wounds on 4+; AP3 → save 4+3=7 → roll 6 < 7 → FAIL save. Good.
    const weapon3: WeaponProfile = { ...basicWeapon, ap: 3 };
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      weapon3,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.attacks).toBe(1);
    expect(result.hits).toBe(1);
    expect(result.wounds).toBe(1);
    expect(result.unsavedWounds).toBe(1);
    expect(result.damage).toBe(1);
    expect(result.modelsSlain).toBe(1);
  });

  it("all rolls of 1: no hits, no wounds, no damage", () => {
    const result = simulateWeaponOnce(
      alwaysRoll(1),
      basicWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.attacks).toBe(1);
    expect(result.hits).toBe(0);
    expect(result.wounds).toBe(0);
    expect(result.unsavedWounds).toBe(0);
    expect(result.damage).toBe(0);
    expect(result.modelsSlain).toBe(0);
  });

  it("TORRENT weapon auto-hits regardless of roll value", () => {
    const torrent: WeaponProfile = {
      ...basicWeapon,
      attacks: 3,
      ap: 3,
      abilities: [{ type: "TORRENT" }],
    };
    const result = simulateWeaponOnce(
      alwaysRoll(1),
      torrent,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    // Roll of 1 would normally miss, but TORRENT auto-hits
    // Roll of 1 wounds? S4 vs T4 → wound on 4+. Roll 1 < 4 → no wound.
    expect(result.attacks).toBe(3);
    expect(result.hits).toBe(3);
    expect(result.wounds).toBe(0);
  });

  it("LETHAL_HITS: crit hits (6s) become auto-wounds, skipping the wound roll", () => {
    // alwaysRoll(6): all attacks are crits → all auto-wound via Lethal Hits
    // S1 vs T4 would normally wound on 6+, but Lethal Hits bypasses that roll
    const lethalWeapon: WeaponProfile = {
      ...basicWeapon,
      attacks: 2,
      strength: 1,
      ap: 3,
      abilities: [{ type: "LETHAL_HITS" }],
    };
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      lethalWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.hits).toBe(2);
    // Both crit hits become auto-wounds even though S1 vs T4 would never wound on a normal roll
    expect(result.wounds).toBe(2);
    expect(result.unsavedWounds).toBe(2);
  });

  it("DEVASTATING_WOUNDS: crit wounds (6s) bypass saving throws", () => {
    // S4 vs T4 → wound on 4+. With always-roll-6, all wounds are crits.
    // Infantry has 4+ save. Normally some saves pass, but Devastating Wounds skips saves entirely.
    const devastatingWeapon: WeaponProfile = {
      ...basicWeapon,
      attacks: 2,
      abilities: [{ type: "DEVASTATING_WOUNDS" }],
    };
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      devastatingWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.hits).toBe(2);
    expect(result.wounds).toBe(2);
    // All wounds are crit wounds → bypass saves → all unsaved
    expect(result.unsavedWounds).toBe(2);
  });

  it("normal wounds: damage is capped at remaining model wounds (no spillover)", () => {
    // 1 wound model, weapon deals 3 damage per wound → only 1 damage applied
    const heavyWeapon: WeaponProfile = { ...basicWeapon, ap: 3, damage: 3 };
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      heavyWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.unsavedWounds).toBe(1);
    // damage capped at 1 (model has 1 wound), not 3
    expect(result.damage).toBe(1);
    expect(result.modelsSlain).toBe(1);
  });

  it("model health tracking: 2 attacks of 5 damage vs 10-wound tank, all hit/wound/fail save", () => {
    const multiDmg: WeaponProfile = {
      ...basicWeapon,
      attacks: 2,
      ap: 5,
      damage: 5,
      strength: 10,
    };
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      multiDmg,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      tankProfile,
      1,
      DEFAULT_DEFENDER_CONTEXT,
    );
    // Tank has 10 wounds. Two hits of 5 damage = 10 damage total → 1 model slain
    expect(result.modelsSlain).toBe(1);
    expect(result.damage).toBe(10);
  });

  it("multiple models: 3 attackerModelCount multiplies attacks", () => {
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      { ...basicWeapon, ap: 3 },
      3,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.attacks).toBe(3);
  });

  it("defender in cover: save roll that fails without cover passes with cover", () => {
    // weapon: skill 3+, S8 vs T4 → wound on 3+, AP0 → armor save 4+
    // alwaysRoll(3): roll 3 >= 3 → hit; roll 3 >= 3 → wound
    // without cover: save 4+, roll 3 < 4 → fails save → 1 unsaved wound
    // in cover: save 3+ (4 − 1), roll 3 >= 3 → saves → 0 unsaved wounds
    const highStrWeapon: WeaponProfile = { ...basicWeapon, strength: 8, ap: 0 };

    const withCover = simulateWeaponOnce(
      alwaysRoll(3),
      highStrWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      { inCover: true },
    );
    const noCover = simulateWeaponOnce(
      alwaysRoll(3),
      highStrWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );

    expect(withCover.hits).toBe(1);
    expect(withCover.wounds).toBe(1);
    expect(withCover.unsavedWounds).toBe(0); // saved by cover

    expect(noCover.hits).toBe(1);
    expect(noCover.wounds).toBe(1);
    expect(noCover.unsavedWounds).toBe(1); // failed save without cover
  });

  it("ANTI + DEVASTATING_WOUNDS: crit wounds on matching keyword bypass saves", () => {
    // Weapon: ANTI-VEHICLE 4+, DEVASTATING_WOUNDS
    // Defender: VEHICLE keyword, save 2+ (very good save that would normally block everything)
    // alwaysRoll(6): hits (6 >= 3), wounds vs T8 (need 6+ for S4 vs T8; roll 6 = crit wound via Anti 4+)
    // Devastating Wounds: crit wounds bypass saves entirely
    const antiWeapon: WeaponProfile = {
      ...basicWeapon,
      attacks: 2,
      strength: 4,
      ap: 0,
      abilities: [
        { type: "ANTI", keyword: "VEHICLE", threshold: 4 },
        { type: "DEVASTATING_WOUNDS" },
      ],
    };
    const vehicle: UnitProfile = {
      id: "vehicle",
      name: "Vehicle",
      toughness: 8,
      save: 2,
      wounds: 1,
      keywords: ["VEHICLE"],
      shootingWeapons: [],
      meleeWeapons: [],
    };

    const result = simulateWeaponOnce(
      alwaysRoll(6),
      antiWeapon,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      vehicle,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );

    expect(result.hits).toBe(2);
    expect(result.wounds).toBe(2);
    // Both wounds are crit wounds (roll 6 >= Anti threshold 4) → bypass 2+ save
    expect(result.unsavedWounds).toBe(2);
  });

  it("resolves DiceExpression strength per attack for wound threshold", () => {
    // S: "D6" always rolling 6 → effective S=6 vs T4 → wounds on 3+
    // S: "D6" always rolling 6 → effective S=6 vs T4 → wounds on 3+; AP=-10 bypasses save
    const weaponWithDiceStrength: WeaponProfile = {
      ...basicWeapon,
      strength: "D6",
      ap: 10,
    };
    const result = simulateWeaponOnce(
      alwaysRoll(6),
      weaponWithDiceStrength,
      1,
      DEFAULT_ATTACKER_CONTEXT,
      infantry,
      10,
      DEFAULT_DEFENDER_CONTEXT,
    );
    expect(result.hits).toBe(1);
    expect(result.wounds).toBe(1);
    expect(result.unsavedWounds).toBe(1);
  });
});
