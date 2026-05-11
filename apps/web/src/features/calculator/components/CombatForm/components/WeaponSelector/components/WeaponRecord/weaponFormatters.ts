import type { WeaponAbility, WeaponProfile } from "@/lib/calculator/types";

export const formatAbilityLabel = (ability: WeaponAbility): string => {
  switch (ability.type) {
    case "ANTI":
      return `Anti-${ability.keyword} ${ability.threshold}+`;
    case "ASSAULT":
      return "Assault";
    case "BLAST":
      return "Blast";
    case "CONVERSION":
      return "Conversion";
    case "DEVASTATING_WOUNDS":
      return "Devastating Wounds";
    case "HAZARDOUS":
      return "Hazardous";
    case "HEAVY":
      return "Heavy";
    case "IGNORES_COVER":
      return "Ignores Cover";
    case "INDIRECT_FIRE":
      return "Indirect Fire";
    case "LANCE":
      return "Lance";
    case "LETHAL_HITS":
      return "Lethal Hits";
    case "LINKED_FIRE":
      return "Linked Fire";
    case "MELTA":
      return `Melta ${ability.value}`;
    case "PISTOL":
      return "Pistol";
    case "PRECISION":
      return "Precision";
    case "PSYCHIC":
      return "Psychic";
    case "RAPID_FIRE":
      return `Rapid Fire ${ability.value}`;
    case "SUSTAINED_HITS":
      return `Sustained Hits ${ability.value}`;
    case "TORRENT":
      return "Torrent";
    case "TWIN_LINKED":
      return "Twin-linked";
    default:
      return "-";
  }
};

export const formatAbilities = (abilities: WeaponAbility[]): string =>
  abilities.map(formatAbilityLabel).join(", ");

export const formatStats = (
  weapon: WeaponProfile,
  weaponType: "shooting" | "melee",
): Array<{ label: string; value: string }> => [
  { label: weaponType === "shooting" ? "BS" : "WS", value: `${weapon.skill}+` },
  { label: "A", value: String(weapon.attacks) },
  { label: "S", value: String(weapon.strength) },
  { label: "AP-", value: String(weapon.ap) },
  { label: "D", value: String(weapon.damage) },
];
