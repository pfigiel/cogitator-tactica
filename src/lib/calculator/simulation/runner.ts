import {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
  WeaponResult,
  CombatStep,
} from "../types";
import { Rng } from "./rng";
import { StepCounts, simulateWeaponOnce } from "./pipeline";

export const SIMULATION_RUNS = 10_000;

export async function runSimulation(
  rng: Rng,
  weapon: WeaponProfile,
  attackerModelCount: number,
  attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
  defenderUnit: UnitProfile,
  defenderModelCount: number,
  defenderContext: DefenderContext = DEFAULT_DEFENDER_CONTEXT,
): Promise<WeaponResult> {
  const accumulated: StepCounts = {
    attacks: 0, hits: 0, wounds: 0,
    unsavedWounds: 0, damage: 0, modelsSlain: 0,
  };

  for (let i = 0; i < SIMULATION_RUNS; i++) {
    const counts = simulateWeaponOnce(
      rng, weapon, attackerModelCount, attackerContext,
      defenderUnit, defenderModelCount, defenderContext,
    );
    accumulated.attacks      += counts.attacks;
    accumulated.hits         += counts.hits;
    accumulated.wounds       += counts.wounds;
    accumulated.unsavedWounds += counts.unsavedWounds;
    accumulated.damage       += counts.damage;
    accumulated.modelsSlain  += counts.modelsSlain;
  }

  const avg = (n: number) => n / SIMULATION_RUNS;

  const avgAttacks      = avg(accumulated.attacks);
  const avgHits         = avg(accumulated.hits);
  const avgWounds       = avg(accumulated.wounds);
  const avgUnsaved      = avg(accumulated.unsavedWounds);
  const avgDamage       = avg(accumulated.damage);
  const avgModelsSlain  = avg(accumulated.modelsSlain);

  const steps: CombatStep[] = [
    { label: "Attacks",        input: attackerModelCount, average: avgAttacks      },
    { label: "Hits",           input: avgAttacks,         average: avgHits         },
    { label: "Wounds",         input: avgHits,            average: avgWounds       },
    { label: "Unsaved Wounds", input: avgWounds,          average: avgUnsaved      },
    { label: "Damage",         input: avgUnsaved,         average: avgDamage       },
    { label: "Models Slain",   input: avgDamage,          average: avgModelsSlain  },
  ];

  return {
    weaponName: weapon.name,
    modelCount: attackerModelCount,
    steps,
    averageDamage: avgDamage,
    averageModelsSlain: avgModelsSlain,
  };
}
