/**
 * Public API for the combat calculator.
 */

import {
  CombatInput,
  CombatResult,
  DirectionalResult,
  SelectedWeaponInput,
  UnitProfile,
  AttackerContext,
  DefenderContext,
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "./types";
import { standardRng } from "./simulation/rng";
import { runSimulation } from "./simulation/runner";

async function resolveDirection(
  attackerUnit: UnitProfile,
  attackerModelCount: number,
  attackerContext: AttackerContext,
  selectedWeapons: SelectedWeaponInput[],
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext,
): Promise<DirectionalResult> {
  const weaponResults = await Promise.all(
    selectedWeapons.map(({ weapon, modelCount }) =>
      runSimulation(
        standardRng,
        weapon,
        modelCount,
        attackerContext,
        defenderUnit,
        defenderModelCount,
        defenderContext,
      )
    )
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

export async function calculate(input: CombatInput): Promise<CombatResult> {
  if (input.phase === "shooting") {
    const { attacker, defender } = input;

    const primary = await resolveDirection(
      attacker.unit,
      attacker.modelCount,
      attacker.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
      attacker.selectedWeapons,
      defender.unit,
      defender.modelCount,
      defender.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
    );

    return { phase: "shooting", primary };
  }

  const { attacker, defender, firstFighter } = input;

  const [primary, counterattack] = await Promise.all([
    resolveDirection(
      attacker.unit,
      attacker.modelCount,
      attacker.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
      attacker.selectedWeapons,
      defender.unit,
      defender.modelCount,
      defender.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
    ),
    resolveDirection(
      defender.unit,
      defender.modelCount,
      defender.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
      defender.selectedWeapons,
      attacker.unit,
      attacker.modelCount,
      attacker.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
    ),
  ]);

  const firstFighterNote =
    firstFighter === "defender"
      ? `${defender.unit.name} fights first. Their counterattack resolves before ${attacker.unit.name} attacks. Casualties from the counterattack are not yet reflected in the primary attack (full model counts used).`
      : `${attacker.unit.name} fights first. Casualties from the primary attack are not yet reflected in the counterattack counts.`;

  return { phase: "melee", primary, counterattack, firstFighterNote };
}

export * from "./types";
