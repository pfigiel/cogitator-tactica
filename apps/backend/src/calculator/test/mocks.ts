import type { CombatInput, CombatResult, DirectionalResult } from "../types";
import {
  getMockUnitProfile,
  getMockWeaponProfile,
} from "../../common/test/mocks";

export const getMockDirectionalResult = (
  overrides: Partial<DirectionalResult> = {},
): DirectionalResult => ({
  attackerName: "Attacker (5)",
  defenderName: "Defender",
  weaponResults: [],
  totalAverageDamage: 3.5,
  totalAverageModelsSlain: 1.2,
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
      unit: getMockUnitProfile(),
      modelCount: 5,
      selectedWeapons: [{ weapon: getMockWeaponProfile(), modelCount: 5 }],
    },
    defender: {
      unit: getMockUnitProfile(),
      modelCount: 10,
      selectedWeapons: [],
    },
    ...overrides,
  }) as CombatInput;
