export type DiceExpression = number | string;

export type WeaponAbility =
  | { type: "ANTI"; keyword: string; threshold: number }
  | { type: "ASSAULT" }
  | { type: "BLAST" }
  | { type: "BUBBLECHUKKA" }
  | { type: "CONVERSION" }
  | { type: "CTAN_POWER" }
  | { type: "DEAD_CHOPPY" }
  | { type: "DEVASTATING_WOUNDS" }
  | { type: "EXTRA_ATTACKS" }
  | { type: "HARPOONED" }
  | { type: "HAZARDOUS" }
  | { type: "HEAVY" }
  | { type: "HOOKED" }
  | { type: "IGNORES_COVER" }
  | { type: "IMPALED" }
  | { type: "INDIRECT_FIRE" }
  | { type: "LANCE" }
  | { type: "LETHAL_HITS" }
  | { type: "LINKED_FIRE" }
  | { type: "MELTA"; value: number }
  | { type: "ONE_SHOT" }
  | { type: "OVERCHARGE" }
  | { type: "PISTOL" }
  | { type: "PLASMA_WARHEAD" }
  | { type: "PRECISION" }
  | { type: "PSYCHIC" }
  | { type: "PSYCHIC_ASSASSIN" }
  | { type: "RAPID_FIRE"; value: DiceExpression }
  | { type: "REVERBERATING_SUMMONS" }
  | { type: "SNAGGED" }
  | { type: "SUSTAINED_HITS"; value: DiceExpression }
  | { type: "TORRENT" }
  | { type: "TWIN_LINKED" };

export type WeaponProfile = {
  id: string;
  name: string;
  attacks: DiceExpression;
  skill: number;
  strength: DiceExpression;
  ap: number;
  damage: DiceExpression;
  abilities: WeaponAbility[];
};

export type UnitProfile = {
  id: string;
  name: string;
  toughness: number;
  save: number;
  invuln?: number;
  wounds: number;
  keywords: string[];
  shootingWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
};

export type AttackerContext = {
  remainedStationary: boolean;
  charged: boolean;
  atHalfRange: boolean;
  atLongRange: boolean;
};

export const DEFAULT_ATTACKER_CONTEXT: AttackerContext = {
  remainedStationary: false,
  charged: false,
  atHalfRange: false,
  atLongRange: false,
};

export type DefenderContext = {
  inCover: boolean;
};

export const DEFAULT_DEFENDER_CONTEXT: DefenderContext = {
  inCover: false,
};

export type Phase = "shooting" | "melee";
export type FirstFighter = "attacker" | "defender";

export type SelectedWeapon = {
  weaponId: string;
  modelCount?: number;
};

export type CombatFormState = {
  phase: Phase;
  attackerUnitId: string;
  attackerCount: number;
  attackerWeapons: SelectedWeapon[];
  attackerContext: AttackerContext;
  defenderUnitId: string;
  defenderCount: number;
  defenderInCover: boolean;
  defenderWeapons: SelectedWeapon[];
  defenderContext: AttackerContext;
  firstFighter: FirstFighter;
};
