export type UnitEmbeddingParams = {
  name: string;
  altNames?: string[];
  faction?: string;
  meleeWeapons?: string[];
  rangedWeapons?: string[];
};

export const buildUnitEmbeddingText = ({
  name,
  altNames,
  faction,
  meleeWeapons,
  rangedWeapons,
}: UnitEmbeddingParams): string => {
  const lines = [`Unit: ${name}`];
  if (altNames?.length) lines.push(`Alternative names: ${altNames.join(", ")}`);
  if (faction) lines.push(`Faction: ${faction}`);
  if (meleeWeapons?.length)
    lines.push(`Melee weapons: ${meleeWeapons.join(", ")}`);
  if (rangedWeapons?.length)
    lines.push(`Ranged weapons: ${rangedWeapons.join(", ")}`);
  return lines.join("\n");
};
