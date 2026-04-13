import type { WeaponProfile } from "@/lib/calculator/types";
import { Paper, Group, Stack, Button, NumberInput } from "@/ui";
import { formatStats, formatAbilities } from "./weaponFormatters";
import styles from "./WeaponRecord.module.css";

type SelectionProps = {
  modelCount: number;
  onCountChange: (count: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

type Props = {
  weapon: WeaponProfile;
  weaponType: "shooting" | "melee";
  isSelected: boolean;
  onToggle: () => void;
  selectionProps?: SelectionProps;
};

export const WeaponRecord = ({
  weapon,
  weaponType,
  isSelected,
  onToggle,
  selectionProps,
}: Props) => {
  const stats = formatStats(weapon, weaponType);
  const abilities = formatAbilities(weapon.abilities);

  return (
    <Paper withBorder p="xs">
      <Group wrap="nowrap" align="center" gap="xs">
        <Button
          size="compact-xs"
          variant="subtle"
          color="yellow"
          onClick={onToggle}
          aria-label={
            isSelected ? `Remove ${weapon.name}` : `Add ${weapon.name}`
          }
          className={styles.toggleButton}
        >
          {isSelected ? "−" : "+"}
        </Button>

        <div className={styles.content}>
          <div className={styles.name}>{weapon.name}</div>
          <div className={styles.stats}>
            {stats.map(({ label, value }) => (
              <span className={styles.statLabel} key={label}>
                <span>{label}</span>
                <span className={styles.statValue}>{value}</span>{" "}
              </span>
            ))}
          </div>
          <div className={styles.abilities}>
            {abilities.length ? abilities : "-"}
          </div>
        </div>

        {selectionProps && (
          <>
            <NumberInput
              size="xs"
              w={70}
              min={1}
              max={100}
              value={selectionProps.modelCount}
              onChange={(val) =>
                selectionProps.onCountChange(
                  typeof val === "number" ? Math.max(1, val) : 1,
                )
              }
              className={styles.countInput}
            />
            <Stack gap="2px" className={styles.orderButtons}>
              <Button
                size="compact-xs"
                variant="subtle"
                color="yellow"
                onClick={selectionProps.onMoveUp}
                disabled={selectionProps.isFirst}
                aria-label={`Move ${weapon.name} up`}
              >
                ▲
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                color="yellow"
                onClick={selectionProps.onMoveDown}
                disabled={selectionProps.isLast}
                aria-label={`Move ${weapon.name} down`}
              >
                ▼
              </Button>
            </Stack>
          </>
        )}
      </Group>
    </Paper>
  );
};
