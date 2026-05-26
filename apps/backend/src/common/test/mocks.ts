import type { UnitProfile, WeaponProfile } from "../types";

export const getMockWeaponProfile = (
  overrides: Partial<WeaponProfile> = {},
): WeaponProfile => ({
  id: "weapon-id",
  name: "weapon-name",
  attacks: 2,
  skill: 3,
  strength: 4,
  ap: -1,
  damage: 1,
  abilities: [],
  ...overrides,
});

export const getMockUnitProfile = (
  overrides: Partial<UnitProfile> = {},
): UnitProfile => ({
  id: "unit-id",
  name: "unit-name",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
  ...overrides,
});
