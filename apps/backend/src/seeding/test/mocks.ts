import type { UnitWithFaction } from "../wahapedia-parser.service";

export const getMockWeaponWithFaction = (
  overrides: Partial<UnitWithFaction["shootingWeapons"][0]> = {},
): UnitWithFaction["shootingWeapons"][0] => ({
  id: "bolt_rifle",
  name: "Bolt Rifle",
  attacks: 2,
  skill: 3,
  strength: 4,
  ap: -1,
  damage: 1,
  abilities: [],
  ...overrides,
});

export const getMockUnitWithFaction = (
  overrides: Partial<UnitWithFaction> = {},
): UnitWithFaction => ({
  id: "intercessors",
  name: "Intercessors",
  factionId: "SM",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["INFANTRY"],
  shootingWeapons: [],
  meleeWeapons: [],
  defaultShootingWeaponIds: [],
  defaultMeleeWeaponIds: [],
  ...overrides,
});
