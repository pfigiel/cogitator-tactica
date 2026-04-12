import type { SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Stack } from "@/ui";
import { WeaponRecord } from "./components/WeaponRecord";
import styles from "./WeaponSelector.module.css";

export const WeaponSelector = ({
  weapons,
  selected,
  defaultModelCount,
  weaponType,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  weaponType: "shooting" | "melee";
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}) => {
  if (weapons.length === 0) return null;

  const selectedWeapons = selected
    .map((s) => ({
      profile: weapons.find((w) => w.name === s.weaponName),
      entry: s,
    }))
    .filter((x): x is { profile: WeaponProfile; entry: SelectedWeapon } =>
      x.profile !== undefined
    );

  const availableWeapons = weapons.filter(
    (w) => !selected.some((s) => s.weaponName === w.name)
  );

  return (
    <Stack gap="xs">
      <Stack gap="xs">
        <span className={styles.dimmed}>Selected weapons</span>
        {selectedWeapons.length === 0 ? (
          <span className={styles.dimmed}>No weapons selected</span>
        ) : (
          selectedWeapons.map((sw, idx) => (
            <WeaponRecord
              key={sw.profile.name}
              weapon={sw.profile}
              weaponType={weaponType}
              isSelected={true}
              onToggle={() => onToggle(sw.profile.name)}
              selectionProps={{
                modelCount: sw.entry.modelCount ?? defaultModelCount,
                onCountChange: (val) => onCountChange(sw.profile.name, val),
                onMoveUp: () => onMoveUp(sw.profile.name),
                onMoveDown: () => onMoveDown(sw.profile.name),
                isFirst: idx === 0,
                isLast: idx === selectedWeapons.length - 1,
              }}
            />
          ))
        )}
      </Stack>
      <Stack gap="xs">
        <span className={styles.dimmed}>Available weapons</span>
        {availableWeapons.length === 0 ? (
          <span className={styles.dimmed}>No weapons available</span>
        ) : (
          availableWeapons.map((w) => (
            <WeaponRecord
              key={w.name}
              weapon={w}
              weaponType={weaponType}
              isSelected={false}
              onToggle={() => onToggle(w.name)}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
};
