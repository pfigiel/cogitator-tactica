export type RerollType = "ONES" | "ALL";

export type ModifierEffect =
  | { type: "HIT_THRESHOLD_DELTA"; value: number }
  | { type: "WOUND_THRESHOLD_DELTA"; value: number }
  | { type: "SAVE_THRESHOLD_DELTA"; value: number }
  | { type: "INVULN_THRESHOLD_DELTA"; value: number }
  | { type: "CRIT_HIT_THRESHOLD"; value: number }
  | { type: "CRIT_WOUND_THRESHOLD"; value: number }
  | { type: "HIT_REROLL"; reroll: RerollType }
  | { type: "WOUND_REROLL"; reroll: RerollType }
  | { type: "SAVE_REROLL"; reroll: RerollType }
  | { type: "EXTRA_ATTACKS"; value: number }
  | { type: "EXTRA_DAMAGE"; value: number }
  | { type: "AUTO_HIT" }
  | { type: "LETHAL_HITS" }
  | { type: "SUSTAINED_HITS"; value: number }
  | { type: "DEVASTATING_WOUNDS" }
  | { type: "IGNORE_COVER" };

export type Modifier = {
  source: string;
  effect: ModifierEffect;
};

export type StepCounts = {
  attacks: number;
  hits: number;
  wounds: number;
  unsavedWounds: number;
  damage: number;
  modelsSlain: number;
};

export type CombatStep = {
  label: string;
  input: number;
  average: number;
};

export type WeaponResult = {
  weaponName: string;
  modelCount: number;
  steps: CombatStep[];
  averageDamage: number;
  averageModelsSlain: number;
};

export type DirectionalResult = {
  attackerName: string;
  defenderName: string;
  weaponResults: WeaponResult[];
  totalAverageDamage: number;
  totalAverageModelsSlain: number;
};

export type CombatResult = {
  phase: "shooting" | "melee";
  primary: DirectionalResult;
  counterattack?: DirectionalResult;
  firstFighterNote?: string;
};

import type {
  WeaponProfile,
  UnitProfile,
  AttackerContext,
  DefenderContext,
} from "../common/types";

export type SelectedWeaponInput = {
  weapon: WeaponProfile;
  modelCount: number;
};

export type CombatantInput = {
  unit: UnitProfile;
  modelCount: number;
  defenderContext?: DefenderContext;
  attackerContext?: AttackerContext;
  selectedWeapons: SelectedWeaponInput[];
};

export type ShootingCombatInput = {
  phase: "shooting";
  attacker: CombatantInput;
  defender: CombatantInput;
};

export type MeleeCombatInput = {
  phase: "melee";
  attacker: CombatantInput;
  defender: CombatantInput;
  firstFighter: "attacker" | "defender";
};

export type CombatInput = ShootingCombatInput | MeleeCombatInput;
