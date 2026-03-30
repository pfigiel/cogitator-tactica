// ─── Weapon special abilities ────────────────────────────────────────────────

export type WeaponAbility =
  | { type: "SUSTAINED_HITS"; value: number } // each crit hit generates N extra hits
  | { type: "LETHAL_HITS" }                   // crit hits auto-wound (skip wound roll)
  | { type: "DEVASTATING_WOUNDS" }            // crit wounds deal mortal wounds (skip save)
  | { type: "TORRENT" };                      // auto-hits (no hit roll needed)

// ─── Weapon profile ──────────────────────────────────────────────────────────

export interface WeaponProfile {
  name: string;
  /** Number of attacks per model. Can be a fixed number. Future: DiceExpression. */
  attacks: number;
  /** Skill threshold (e.g. 3 means 3+). For BS (shooting) or WS (melee). */
  skill: number;
  strength: number;
  ap: number;
  damage: number;
  abilities: WeaponAbility[];
}

// ─── Unit profile ─────────────────────────────────────────────────────────────

export interface UnitProfile {
  id: string;
  name: string;
  toughness: number;
  save: number;         // e.g. 3 means 3+
  invuln?: number;      // e.g. 5 means 5+ invulnerable
  wounds: number;       // wounds per model
  shootingWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
}

// ─── Combat input ─────────────────────────────────────────────────────────────

export type Phase = "shooting" | "melee";
export type FirstFighter = "attacker" | "defender";

export interface CombatantInput {
  unit: UnitProfile;
  modelCount: number;
  inCover?: boolean;    // +1 to save roll
}

export interface ShootingCombatInput {
  phase: "shooting";
  attacker: CombatantInput;
  defender: CombatantInput;
}

export interface MeleeCombatInput {
  phase: "melee";
  attacker: CombatantInput;
  defender: CombatantInput;
  firstFighter: FirstFighter;
}

export type CombatInput = ShootingCombatInput | MeleeCombatInput;

// ─── Combat results ───────────────────────────────────────────────────────────

/**
 * A single step in the combat resolution pipeline.
 * Future stats (std dev, probability curves) can be added without breaking callers.
 */
export interface CombatStep {
  label: string;
  /** The number of dice / tokens entering this step */
  input: number;
  /** Expected successes / output from this step */
  average: number;
  /** Human-readable explanation of what happened */
  note?: string;
}

export interface DirectionalResult {
  attackerName: string;
  defenderName: string;
  steps: CombatStep[];
  /** Expected total damage dealt */
  averageDamage: number;
  /** Expected models fully slain */
  averageModelsSlain: number;
}

export interface CombatResult {
  phase: Phase;
  /** For shooting: one direction. For melee: attacker→defender direction. */
  primary: DirectionalResult;
  /** For melee only: defender→attacker counterattack direction. */
  counterattack?: DirectionalResult;
  /** If melee and firstFighter = defender, note that primary was resolved second. */
  firstFighterNote?: string;
}

// ─── Form / LLM types ─────────────────────────────────────────────────────────

/** The structured form state that drives both UI and calculator */
export interface CombatFormState {
  phase: Phase;
  attackerUnitId: string;
  attackerCount: number;
  defenderUnitId: string;
  defenderCount: number;
  defenderInCover: boolean;
  firstFighter: FirstFighter; // only relevant for melee
}
