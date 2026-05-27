import { Injectable } from "@nestjs/common";
import type {
  UnitProfile,
  AttackerContext,
  DefenderContext,
} from "../common/types";
import {
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "../common/types";
import { SimulationService } from "./simulation.service";
import type {
  CombatInput,
  CombatResult,
  DirectionalResult,
  SelectedWeaponInput,
} from "./types";

@Injectable()
export class CalculatorService {
  constructor(private readonly simulation: SimulationService) {}

  async calculate(input: CombatInput): Promise<CombatResult> {
    if (input.phase === "shooting") {
      const { attacker, defender } = input;

      const primary = await this.resolveDirection(
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
      this.resolveDirection(
        attacker.unit,
        attacker.modelCount,
        attacker.attackerContext ?? DEFAULT_ATTACKER_CONTEXT,
        attacker.selectedWeapons,
        defender.unit,
        defender.modelCount,
        defender.defenderContext ?? DEFAULT_DEFENDER_CONTEXT,
      ),
      this.resolveDirection(
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

  private async resolveDirection(
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
        this.simulation.runSimulation(
          weapon,
          modelCount,
          attackerContext,
          defenderUnit,
          defenderModelCount,
          defenderContext,
        ),
      ),
    );

    const totalAverageDamage = weaponResults.reduce(
      (sum, r) => sum + r.averageDamage,
      0,
    );
    const totalAverageModelsSlain = weaponResults.reduce(
      (sum, r) => sum + r.averageModelsSlain,
      0,
    );

    return {
      attackerName: `${attackerUnit.name} (${attackerModelCount})`,
      defenderName: defenderUnit.name,
      weaponResults,
      totalAverageDamage,
      totalAverageModelsSlain,
    };
  }
}
