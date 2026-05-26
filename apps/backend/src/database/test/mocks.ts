import { DbUnit, DbUnitWithWeapons } from "../types";

export const getMockDbUnit = (overrides: Partial<DbUnit> = {}): DbUnit => ({
  name: "unit-name",
  id: "unit-id",
  factionId: "faction-id",
  toughness: 4,
  save: 3,
  invuln: null,
  wounds: 2,
  keywords: [],
  altNames: [],
  ...overrides,
});

export const getMockDbUnitWithWeapons = ({
  unitWeapons,
  ...overrides
}: Partial<DbUnitWithWeapons> = {}): DbUnitWithWeapons => ({
  ...getMockDbUnit(overrides),
  unitWeapons: unitWeapons ?? [],
});
