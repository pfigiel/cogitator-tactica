import type { CombatFormState, UnitProfile } from "@/features/calculator/types";
import { DEFAULT_ATTACKER_CONTEXT } from "@/features/calculator/types";

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

export const getMockCombatFormState = (
  overrides: Partial<CombatFormState> = {},
): CombatFormState => ({
  phase: "shooting",
  attackerUnitId: "unit-1",
  attackerCount: 10,
  attackerWeapons: [],
  attackerContext: DEFAULT_ATTACKER_CONTEXT,
  defenderUnitId: "unit-2",
  defenderCount: 10,
  defenderInCover: false,
  defenderWeapons: [],
  defenderContext: DEFAULT_ATTACKER_CONTEXT,
  firstFighter: "attacker",
  ...overrides,
});
