import type { SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Stack } from "@/ui";
import { WeaponRecord } from "./components/WeaponRecord";
import styles from "./WeaponSelector.module.css";

type Props = {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  weaponType: "shooting" | "melee";
  onToggle: (weaponId: string) => void;
  onCountChange: (weaponId: string, count: number) => void;
  onMoveUp: (weaponId: string) => void;
  onMoveDown: (weaponId: string) => void;
};

export const WeaponSelector = ({
  weapons,
  selected,
  defaultModelCount,
  weaponType,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: Props) => {
  if (weapons.length === 0) return null;

  const selectedWeapons = selected
    .map((s) => ({
      profile: weapons.find((w) => w.id === s.weaponId),
      entry: s,
    }))
    .filter(
      (x): x is { profile: WeaponProfile; entry: SelectedWeapon } =>
        x.profile !== undefined,
    );

  const availableWeapons = weapons.filter(
    (w) => !selected.some((s) => s.weaponId === w.id),
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
              key={sw.profile.id}
              weapon={sw.profile}
              weaponType={weaponType}
              isSelected={true}
              onToggle={() => onToggle(sw.profile.id)}
              selectionProps={{
                modelCount: sw.entry.modelCount ?? defaultModelCount,
                onCountChange: (val) => onCountChange(sw.profile.id, val),
                onMoveUp: () => onMoveUp(sw.profile.id),
                onMoveDown: () => onMoveDown(sw.profile.id),
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
              key={w.id}
              weapon={w}
              weaponType={weaponType}
              isSelected={false}
              onToggle={() => onToggle(w.id)}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
};
