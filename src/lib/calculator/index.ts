/**
 * Public API for the combat calculator.
 */

import { CombatInput, CombatResult } from "./types";
import { resolveCombat } from "./pipeline";

export function calculate(input: CombatInput): CombatResult {
  if (input.phase === "shooting") {
    const { attacker, defender } = input;
    const weapon = attacker.unit.shootingWeapons[0];

    const primary = resolveCombat(
      attacker.unit,
      attacker.modelCount,
      weapon,
      defender.unit,
      defender.inCover ?? false
    );

    return { phase: "shooting", primary };
  }

  // Melee — both sides fight
  const { attacker, defender, firstFighter } = input;

  const attackerWeapon = attacker.unit.meleeWeapons[0];
  const defenderWeapon = defender.unit.meleeWeapons[0];

  // Primary: attacker → defender
  const primary = resolveCombat(
    attacker.unit,
    attacker.modelCount,
    attackerWeapon,
    defender.unit,
    defender.inCover ?? false
  );

  // Counterattack: defender → attacker
  // Note: if the defender fights first, their losses haven't happened yet — and vice versa.
  // For now we calculate at full model counts and surface a note.
  const counterattack = resolveCombat(
    defender.unit,
    defender.modelCount,
    defenderWeapon,
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
