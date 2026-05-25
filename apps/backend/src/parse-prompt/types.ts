import type { SelectedWeapon } from "../common/types";

export type WeaponHint = { name: string; count?: number };

export type ParsedContext = {
  attackerName: string;
  defenderName: string;
  attackerCount: number;
  defenderCount: number;
  phase: "shooting" | "melee";
  defenderInCover: boolean;
  firstFighter: "attacker" | "defender";
  attackerWeaponHints: WeaponHint[];
  defenderWeaponHints: WeaponHint[];
  attackerFactionId?: string;
  defenderFactionId?: string;
};

export type WeaponResolution = {
  attackerWeapons: SelectedWeapon[];
  defenderWeapons: SelectedWeapon[];
};
