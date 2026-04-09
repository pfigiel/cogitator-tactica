// ─── Weapon special abilities ────────────────────────────────────────────────

export type WeaponAbility =
  | { type: "ANTI"; keyword: string; threshold: number }  // crit wound vs keyword on threshold+
  | { type: "ASSAULT" }                                   // can shoot after Advancing (no calc effect)
  | { type: "BLAST" }                                     // +1 attack per 5 defender models
  | { type: "CONVERSION" }                                // at long range: crit hits on 4+
  | { type: "DEVASTATING_WOUNDS" }                        // crit wounds deal mortal wounds (skip save)
  | { type: "HAZARDOUS" }                                 // self-inflicts mortal wounds (no calc effect)
  | { type: "HEAVY" }                                     // if Remained Stationary: +1 to hit
  | { type: "IGNORES_COVER" }                             // target does not benefit from cover
  | { type: "INDIRECT_FIRE" }                             // −1 to hit; target gains cover
  | { type: "LANCE" }                                     // on the turn you charge: +1 to wound
  | { type: "LETHAL_HITS" }                               // crit hits auto-wound (skip wound roll)
  | { type: "LINKED_FIRE" }                               // LoS from friendly unit (no calc effect)
  | { type: "MELTA"; value: number }                      // at half range: +X damage
  | { type: "PISTOL" }                                    // can shoot in engagement range (no calc effect)
  | { type: "PRECISION" }                                 // target Characters directly (no calc effect)
  | { type: "PSYCHIC" }                                   // psychic weapon keyword (no calc effect)
  | { type: "RAPID_FIRE"; value: number }                 // at half range: +X attacks
  | { type: "SUSTAINED_HITS"; value: number }             // each crit hit generates N extra hits
  | { type: "TORRENT" }                                   // auto-hits (no hit roll needed)
  | { type: "TWIN_LINKED" };                              // re-roll wound rolls

/**
 * A fixed number or a dice expression string, e.g. "D6", "2D6", "D3+3".
 * Valid string pattern: /^(\d+)?D(3|6)([+-]\d+)?$/i
 * The calculator always works with expected (average) values via diceAverage().
 */
export type DiceExpression = number | string;

// ─── Modifiers ────────────────────────────────────────────────────────────────

export type RerollType = "ONES" | "ALL";

/**
 * An atomic effect produced by a modifier source (weapon ability, cover, aura, stratagem, etc.).
 *
 * Aggregation rules:
 *  - *_THRESHOLD_DELTA : sum all sources, then clamp total to [−1, +1] (applied LAST)
 *  - CRIT_*_THRESHOLD  : override — take min across sources (best for attacker)
 *  - EXTRA_ATTACKS / EXTRA_DAMAGE : sum, no cap
 *  - SUSTAINED_HITS    : take max across sources
 *  - *_REROLL          : take best (ALL > ONES)
 *  - Boolean flags     : present if any source provides them
 */
export type ModifierEffect =
  | { type: "HIT_THRESHOLD_DELTA";    value: number }
  | { type: "WOUND_THRESHOLD_DELTA";  value: number }
  | { type: "SAVE_THRESHOLD_DELTA";   value: number }
  | { type: "INVULN_THRESHOLD_DELTA"; value: number }
  /** Crits on X+ for hit rolls — multiple sources: take lowest. */
  | { type: "CRIT_HIT_THRESHOLD";   value: number }
  /** Crits on X+ for wound rolls (e.g. Anti) — multiple sources: take lowest. */
  | { type: "CRIT_WOUND_THRESHOLD"; value: number }
  | { type: "HIT_REROLL";   reroll: RerollType }
  | { type: "WOUND_REROLL"; reroll: RerollType }
  | { type: "SAVE_REROLL";  reroll: RerollType }
  | { type: "EXTRA_ATTACKS"; value: number }
  | { type: "EXTRA_DAMAGE";  value: number }
  | { type: "AUTO_HIT" }
  | { type: "LETHAL_HITS" }
  | { type: "SUSTAINED_HITS"; value: number }
  | { type: "DEVASTATING_WOUNDS" }
  | { type: "IGNORE_COVER" };

/** A resolved modifier from any source (weapon ability, cover, aura, stratagem, …). */
export interface Modifier {
  /** Human-readable source label, e.g. "Twin-linked", "cover", "Heavy". */
  source: string;
  effect: ModifierEffect;
}

// ─── Attacker context ─────────────────────────────────────────────────────────

/**
 * Per-unit situational flags set by the user.
 * Activates context-dependent weapon abilities (Heavy, Lance, Rapid Fire, Melta, Conversion).
 * All false by default.
 */
export interface AttackerContext {
  remainedStationary: boolean; // Heavy: +1 to hit
  charged:            boolean; // Lance: +1 to wound
  atHalfRange:        boolean; // Rapid Fire: +X attacks, Melta: +X damage
  atLongRange:        boolean; // Conversion: crit hits on 4+
}

export const DEFAULT_ATTACKER_CONTEXT: AttackerContext = {
  remainedStationary: false,
  charged:            false,
  atHalfRange:        false,
  atLongRange:        false,
};

// ─── Defender context ─────────────────────────────────────────────────────────

/**
 * Per-unit situational flags for defenders.
 * Can be extended with additional flags (e.g. in cover, jeneration defensible, etc.).
 */
export interface DefenderContext {
  inCover: boolean;
}

export const DEFAULT_DEFENDER_CONTEXT: DefenderContext = {
  inCover: false,
};

// ─── Weapon profile ──────────────────────────────────────────────────────────

export interface WeaponProfile {
  name: string;
  /** Number of attacks per model. Fixed number or dice expression e.g. "D6". */
  attacks: DiceExpression;
  /** Skill threshold (e.g. 3 means 3+). For BS (shooting) or WS (melee). */
  skill: number;
  strength: number;
  ap: number;
  /** Damage per unsaved wound. Fixed number or dice expression e.g. "D3". */
  damage: DiceExpression;
  abilities: WeaponAbility[];
}

// ─── Unit profile ─────────────────────────────────────────────────────────────

export interface UnitProfile {
  id: string;
  name: string;
  toughness: number;
  save: number;    // e.g. 3 means 3+
  invuln?: number; // e.g. 5 means 5+ invulnerable
  wounds: number;  // wounds per model
  /** Unit keywords for Anti ability matching (uppercase, e.g. ["VEHICLE", "WALKER"]). */
  keywords: string[];
  shootingWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
}

// ─── Combat input ─────────────────────────────────────────────────────────────

export type Phase = "shooting" | "melee";
export type FirstFighter = "attacker" | "defender";

export interface SelectedWeaponInput {
  weapon: WeaponProfile;
  modelCount: number;
}

export interface CombatantInput {
  unit: UnitProfile;
  modelCount: number;
  defenderContext?: DefenderContext;
  attackerContext?: AttackerContext;
  selectedWeapons: SelectedWeaponInput[];
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

/** Result for a single weapon within a directional combat resolution. */
export interface WeaponResult {
  weaponName: string;
  modelCount: number;
  steps: CombatStep[];
  averageDamage: number;
  averageModelsSlain: number;
}

export interface DirectionalResult {
  attackerName: string;
  defenderName: string;
  weaponResults: WeaponResult[];
  /** Sum of damage across all weapons */
  totalAverageDamage: number;
  /** Sum of models slain across all weapons (approximation — no overkill carryover between weapons) */
  totalAverageModelsSlain: number;
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

/**
 * A weapon selected for use in combat.
 * modelCount overrides the unit's total model count (e.g. only 2 models have grenade launchers).
 * If omitted, defaults to the unit's total model count.
 */
export interface SelectedWeapon {
  weaponName: string;
  modelCount?: number;
}

/** The structured form state that drives both UI and calculator */
export interface CombatFormState {
  phase: Phase;
  attackerUnitId: string;
  attackerCount: number;
  /** Ordered list of selected weapons for the attacker (shooting weapons in shooting, melee in melee). */
  attackerWeapons: SelectedWeapon[];
  attackerContext: AttackerContext;
  defenderUnitId: string;
  defenderCount: number;
  defenderInCover: boolean;
  /** Ordered list of selected melee weapons for the defender (used for melee counterattack). */
  defenderWeapons: SelectedWeapon[];
  defenderContext: AttackerContext; // used for melee counterattack
  firstFighter: FirstFighter;       // only relevant for melee
}
