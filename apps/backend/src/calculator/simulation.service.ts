import { Injectable } from "@nestjs/common";
import type {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
} from "../common/types";
import {
  DEFAULT_ATTACKER_CONTEXT,
  DEFAULT_DEFENDER_CONTEXT,
} from "../common/types";
import {
  resolveWeaponModifiers,
  hasModifier,
  applyAndClampDelta,
  effectiveCritThreshold,
  effectiveReroll,
  totalExtraAttacks,
  totalExtraDamage,
  effectiveSustainedHits,
} from "./modifiers";
import { RngService } from "./rng.service";
import type {
  Modifier,
  StepCounts,
  WeaponResult,
  CombatStep,
  RerollType,
} from "./types";

const DEFAULT_ITERATIONS = 10_000;

@Injectable()
export class SimulationService {
  constructor(private readonly rng: RngService) {}

  async runSimulation(
    weapon: WeaponProfile,
    attackerModelCount: number,
    attackerContext: AttackerContext = DEFAULT_ATTACKER_CONTEXT,
    defenderUnit: UnitProfile,
    defenderModelCount: number,
    defenderContext: DefenderContext = DEFAULT_DEFENDER_CONTEXT,
    iterations: number = DEFAULT_ITERATIONS,
  ): Promise<WeaponResult> {
    const accumulated: StepCounts = {
      attacks: 0,
      hits: 0,
      wounds: 0,
      unsavedWounds: 0,
      damage: 0,
      modelsSlain: 0,
    };

    for (let i = 0; i < iterations; i++) {
      const counts = this.simulateWeaponOnce(
        weapon,
        attackerModelCount,
        attackerContext,
        defenderUnit,
        defenderModelCount,
        defenderContext,
      );
      accumulated.attacks += counts.attacks;
      accumulated.hits += counts.hits;
      accumulated.wounds += counts.wounds;
      accumulated.unsavedWounds += counts.unsavedWounds;
      accumulated.damage += counts.damage;
      accumulated.modelsSlain += counts.modelsSlain;
    }

    const avg = (n: number) => n / iterations;
    const avgAttacks = avg(accumulated.attacks);
    const avgHits = avg(accumulated.hits);
    const avgWounds = avg(accumulated.wounds);
    const avgUnsaved = avg(accumulated.unsavedWounds);
    const avgDamage = avg(accumulated.damage);
    const avgModelsSlain = avg(accumulated.modelsSlain);

    const steps: CombatStep[] = [
      { label: "Attacks", input: attackerModelCount, average: avgAttacks },
      { label: "Hits", input: avgAttacks, average: avgHits },
      { label: "Wounds", input: avgHits, average: avgWounds },
      { label: "Unsaved Wounds", input: avgWounds, average: avgUnsaved },
      { label: "Damage", input: avgUnsaved, average: avgDamage },
      { label: "Models Slain", input: avgDamage, average: avgModelsSlain },
    ];

    return {
      weaponName: weapon.name,
      modelCount: attackerModelCount,
      steps,
      averageDamage: avgDamage,
      averageModelsSlain: avgModelsSlain,
    };
  }

  private simulateWeaponOnce(
    weapon: WeaponProfile,
    attackerModelCount: number,
    attackerContext: AttackerContext,
    defenderUnit: UnitProfile,
    defenderModelCount: number,
    defenderContext: DefenderContext,
  ): StepCounts {
    const modifiers = resolveWeaponModifiers(
      weapon,
      attackerContext,
      defenderUnit,
      defenderContext,
      defenderModelCount,
    );

    const totalAttacks = this.resolveAttacks(
      weapon,
      attackerModelCount,
      modifiers,
    );
    const { normalHits, critHits } = this.resolveHits(
      totalAttacks,
      weapon,
      modifiers,
    );
    const { saveableWounds, mortalWounds } = this.resolveWounds(
      normalHits,
      critHits,
      weapon,
      defenderUnit,
      modifiers,
    );
    const unsavedNormal = this.resolveSaves(
      saveableWounds,
      weapon.ap,
      defenderUnit,
      defenderContext,
      modifiers,
    );
    const { damage, modelsSlain } = this.resolveDamage(
      unsavedNormal,
      mortalWounds,
      weapon,
      defenderUnit,
      defenderModelCount,
      modifiers,
    );

    return {
      attacks: totalAttacks,
      hits: normalHits + critHits,
      wounds: saveableWounds + mortalWounds,
      unsavedWounds: unsavedNormal + mortalWounds,
      damage,
      modelsSlain,
    };
  }

  private resolveAttacks(
    weapon: WeaponProfile,
    attackerModelCount: number,
    modifiers: Modifier[],
  ): number {
    const extraAttacks = totalExtraAttacks(modifiers);
    let total = extraAttacks;
    for (let i = 0; i < attackerModelCount; i++) {
      total += this.rng.dice(weapon.attacks);
    }
    return total;
  }

  private resolveHits(
    totalAttacks: number,
    weapon: WeaponProfile,
    modifiers: Modifier[],
  ): { normalHits: number; critHits: number } {
    const isAutoHit = hasModifier(modifiers, "AUTO_HIT");
    const hitThreshold = applyAndClampDelta(
      weapon.skill,
      modifiers,
      "HIT_THRESHOLD_DELTA",
    );
    const critHitThreshold = effectiveCritThreshold(
      modifiers,
      "CRIT_HIT_THRESHOLD",
      6,
    );
    const hitReroll = effectiveReroll(modifiers, "HIT_REROLL");
    const sustainedHitsValue = effectiveSustainedHits(modifiers);

    let normalHits = 0;
    let critHits = 0;

    if (isAutoHit) {
      normalHits = totalAttacks;
    } else {
      for (let i = 0; i < totalAttacks; i++) {
        const roll = this.rollWithReroll(hitReroll, hitThreshold);
        if (roll >= hitThreshold) {
          if (roll >= critHitThreshold) {
            critHits++;
            normalHits += sustainedHitsValue;
          } else {
            normalHits++;
          }
        }
      }
    }

    return { normalHits, critHits };
  }

  private resolveWounds(
    normalHits: number,
    critHits: number,
    weapon: WeaponProfile,
    defenderUnit: UnitProfile,
    modifiers: Modifier[],
  ): { saveableWounds: number; mortalWounds: number } {
    const hasLethalHits = hasModifier(modifiers, "LETHAL_HITS");
    const baseWoundThresh = this.woundThreshold(
      this.rng.dice(weapon.strength),
      defenderUnit.toughness,
    );
    const effectiveWoundThresh = applyAndClampDelta(
      baseWoundThresh,
      modifiers,
      "WOUND_THRESHOLD_DELTA",
    );
    const critWoundThreshold = effectiveCritThreshold(
      modifiers,
      "CRIT_WOUND_THRESHOLD",
      6,
    );
    const woundReroll = effectiveReroll(modifiers, "WOUND_REROLL");
    const hasDevastatingWounds = hasModifier(modifiers, "DEVASTATING_WOUNDS");

    // Lethal Hits: crit hits skip the wound roll and become auto-wounds (still require saves)
    const autoWounds = hasLethalHits ? critHits : 0;
    const hitsToWoundRoll = normalHits + (hasLethalHits ? 0 : critHits);

    let normalWounds = 0;
    let mortalWounds = 0;

    for (let i = 0; i < hitsToWoundRoll; i++) {
      const roll = this.rollWithReroll(woundReroll, effectiveWoundThresh);
      if (roll >= effectiveWoundThresh) {
        if (roll >= critWoundThreshold && hasDevastatingWounds) {
          mortalWounds++;
        } else {
          normalWounds++;
        }
      }
    }

    return {
      saveableWounds: autoWounds + normalWounds,
      mortalWounds,
    };
  }

  private resolveSaves(
    saveableWounds: number,
    weaponAp: number,
    defenderUnit: UnitProfile,
    defenderContext: DefenderContext,
    modifiers: Modifier[],
  ): number {
    const armorSave = applyAndClampDelta(
      defenderUnit.save + weaponAp,
      modifiers,
      "SAVE_THRESHOLD_DELTA",
    );
    const invuln = defenderUnit.invuln;
    const effectiveInvuln =
      invuln !== undefined
        ? applyAndClampDelta(invuln, modifiers, "INVULN_THRESHOLD_DELTA")
        : undefined;
    const saveThreshold = Math.max(
      2,
      effectiveInvuln !== undefined
        ? Math.min(armorSave, effectiveInvuln)
        : armorSave,
    );

    let unsavedNormal = 0;
    for (let i = 0; i < saveableWounds; i++) {
      if (this.rng.dice("D6") < saveThreshold) {
        unsavedNormal++;
      }
    }

    return unsavedNormal;
  }

  private resolveDamage(
    unsavedNormal: number,
    mortalWounds: number,
    weapon: WeaponProfile,
    defenderUnit: UnitProfile,
    defenderModelCount: number,
    modifiers: Modifier[],
  ): { damage: number; modelsSlain: number } {
    const extraDamage = totalExtraDamage(modifiers);
    let totalDamage = 0;
    let modelsSlain = 0;
    let remainingHealth = defenderUnit.wounds;

    // Normal wounds: damage capped at remaining model health, no spillover
    for (
      let i = 0;
      i < unsavedNormal && modelsSlain < defenderModelCount;
      i++
    ) {
      const rawDmg = this.rng.dice(weapon.damage) + extraDamage;
      const dmg = Math.min(rawDmg, remainingHealth);
      remainingHealth -= dmg;
      totalDamage += dmg;
      if (remainingHealth <= 0) {
        modelsSlain++;
        remainingHealth = defenderUnit.wounds;
      }
    }

    // Mortal wounds: damage spills across model boundaries
    for (let i = 0; i < mortalWounds && modelsSlain < defenderModelCount; i++) {
      let dmg = this.rng.dice(weapon.damage) + extraDamage;
      totalDamage += dmg;
      while (dmg > 0 && modelsSlain < defenderModelCount) {
        const applied = Math.min(dmg, remainingHealth);
        remainingHealth -= applied;
        dmg -= applied;
        if (remainingHealth <= 0) {
          modelsSlain++;
          remainingHealth = defenderUnit.wounds;
        }
      }
    }

    return { damage: totalDamage, modelsSlain };
  }

  private rollWithReroll(reroll: RerollType | null, threshold: number): number {
    const roll = this.rng.dice("D6");
    if (reroll === "ALL" && roll < threshold) return this.rng.dice("D6");
    if (reroll === "ONES" && roll === 1) return this.rng.dice("D6");
    return roll;
  }

  private woundThreshold(strength: number, toughness: number): number {
    if (strength >= toughness * 2) return 2;
    if (strength > toughness) return 3;
    if (strength === toughness) return 4;
    if (strength * 2 > toughness) return 5;
    return 6;
  }
}
