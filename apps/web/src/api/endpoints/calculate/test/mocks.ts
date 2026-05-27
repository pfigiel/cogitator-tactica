import type {
  CombatInput,
  CombatResult,
  DirectionalResult,
} from "@/lib/calculator/types";
import { getMockUnitProfile } from "@/lib/calculator/test/mocks";

export const getMockDirectionalResult = (
  overrides: Partial<DirectionalResult> = {},
): DirectionalResult => ({
  attackerName: "Intercessors (10)",
  defenderName: "Ork Boyz",
  weaponResults: [],
  totalAverageDamage: 5,
  totalAverageModelsSlain: 5,
  ...overrides,
});

export const getMockCombatResult = (
  overrides: Partial<CombatResult> = {},
): CombatResult => ({
  phase: "shooting",
  primary: getMockDirectionalResult(),
  ...overrides,
});

export const getMockCombatInput = (
  overrides: Partial<CombatInput> = {},
): CombatInput =>
  ({
    phase: "shooting",
    attacker: {
      unit: getMockUnitProfile({ id: "unit-1", name: "Intercessors" }),
      modelCount: 10,
      selectedWeapons: [],
    },
    defender: {
      unit: getMockUnitProfile({
        id: "unit-2",
        name: "Ork Boyz",
        save: 6,
        wounds: 1,
      }),
      modelCount: 20,
      selectedWeapons: [],
    },
    ...overrides,
  }) as CombatInput;
