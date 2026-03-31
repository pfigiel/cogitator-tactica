/**
 * Public API for the combat calculator.
 */

import { CombatInput, CombatResult, DirectionalResult, SelectedWeaponInput, UnitProfile } from "./types";
import { resolveWeapon } from "./pipeline";

function resolveDirection(
  attackerUnit: UnitProfile,
  attackerModelCount: number,
  selectedWeapons: SelectedWeaponInput[],
  defenderUnit: UnitProfile,
  defenderInCover: boolean
): DirectionalResult {
  const weaponResults = selectedWeapons.map(({ weapon, modelCount }) =>
    resolveWeapon(modelCount, weapon, defenderUnit, defenderInCover)
  );

  const totalAverageDamage = weaponResults.reduce((sum, r) => sum + r.averageDamage, 0);
  const totalAverageModelsSlain = weaponResults.reduce((sum, r) => sum + r.averageModelsSlain, 0);

  return {
    attackerName: `${attackerUnit.name} (${attackerModelCount})`,
    defenderName: defenderUnit.name,
    weaponResults,
    totalAverageDamage,
    totalAverageModelsSlain,
  };
}

export function calculate(input: CombatInput): CombatResult {
  if (input.phase === "shooting") {
    const { attacker, defender } = input;

    const primary = resolveDirection(
      attacker.unit,
      attacker.modelCount,
      attacker.selectedWeapons,
      defender.unit,
      defender.inCover ?? false
    );

    return { phase: "shooting", primary };
  }

  // Melee — both sides fight
  const { attacker, defender, firstFighter } = input;

  // Primary: attacker → defender
  const primary = resolveDirection(
    attacker.unit,
    attacker.modelCount,
    attacker.selectedWeapons,
    defender.unit,
    defender.inCover ?? false
  );

  // Counterattack: defender → attacker
  // Note: if the defender fights first, their losses haven't happened yet — and vice versa.
  // For now we calculate at full model counts and surface a note.
  const counterattack = resolveDirection(
    defender.unit,
    defender.modelCount,
    defender.selectedWeapons,
    attacker.unit,
    attacker.inCover ?? false
  );

  const firstFighterNote =
    firstFighter === "defender"
      ? `${defender.unit.name} fights first. Their counterattack resolves before ${attacker.unit.name} attacks. Casualties from the counterattack are not yet reflected in the primary attack (full model counts used).`
      : `${attacker.unit.name} fights first. Casualties from the primary attack are not yet reflected in the counterattack counts.`;

  return { phase: "melee", primary, counterattack, firstFighterNote };
}

export * from "./types";
