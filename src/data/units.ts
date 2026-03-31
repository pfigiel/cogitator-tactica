import { UnitProfile } from "@/lib/calculator/types";

/**
 * Unit roster for the prototype.
 * All stats are based on Warhammer 40,000 10th Edition.
 */
export const UNITS: Record<string, UnitProfile> = {
  intercessors: {
    id: "intercessors",
    name: "Intercessors",
    toughness: 4,
    save: 3,
    wounds: 2,
    shootingWeapons: [
      {
        name: "Bolt Rifle",
        attacks: 2,
        skill: 3, // BS 3+
        strength: 4,
        ap: 1,
        damage: 1,
        abilities: [],
      },
      {
        name: "Bolt Pistol",
        attacks: 1,
        skill: 3, // BS 3+
        strength: 4,
        ap: 0,
        damage: 1,
        abilities: [],
      },
      {
        // Krak grenade profile (typically 1 per 5 models, max 2 per squad)
        name: "Grenade Launcher (Krak)",
        attacks: 1,
        skill: 3, // BS 3+
        strength: 9,
        ap: 2,
        damage: 2,
        abilities: [],
      },
      {
        // Frag grenade profile
        name: "Grenade Launcher (Frag)",
        attacks: 1,
        skill: 3, // BS 3+
        strength: 4,
        ap: 0,
        damage: 1,
        abilities: [{ type: "SUSTAINED_HITS", value: 1 }],
      },
    ],
    meleeWeapons: [
      {
        name: "Close Combat Weapon",
        attacks: 3,
        skill: 3, // WS 3+
        strength: 4,
        ap: 0,
        damage: 1,
        abilities: [],
      },
    ],
  },

  ork_boyz: {
    id: "ork_boyz",
    name: "Ork Boyz",
    toughness: 5,
    save: 6,
    wounds: 1,
    shootingWeapons: [
      {
        name: "Slugga",
        attacks: 1,
        skill: 5, // BS 5+
        strength: 4,
        ap: 0,
        damage: 1,
        abilities: [],
      },
      {
        name: "Shoota",
        attacks: 2,
        skill: 5, // BS 5+
        strength: 4,
        ap: 0,
        damage: 1,
        abilities: [],
      },
    ],
    meleeWeapons: [
      {
        name: "Choppa",
        attacks: 2,
        skill: 3, // WS 3+
        strength: 5,
        ap: 1,
        damage: 1,
        abilities: [],
      },
    ],
  },
};

export const UNIT_LIST = Object.values(UNITS);
