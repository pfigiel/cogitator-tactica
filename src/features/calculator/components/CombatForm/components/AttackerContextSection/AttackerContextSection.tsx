import { AttackerContext, SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Checkbox, Stack } from "@/ui";
import styles from "./AttackerContextSection.module.css";

export const relevantContextFlags = (
  weapons: WeaponProfile[],
  selected: SelectedWeapon[]
) => {
  const profiles = selected
    .map((s) => weapons.find((w) => w.name === s.weaponName))
    .filter((w): w is WeaponProfile => w !== undefined);

  return {
    showStationary: profiles.some((w) =>
      w.abilities.some((a) => a.type === "HEAVY")
    ),
    showCharged: profiles.some((w) =>
      w.abilities.some((a) => a.type === "LANCE")
    ),
    showHalfRange: profiles.some((w) =>
      w.abilities.some((a) => a.type === "RAPID_FIRE" || a.type === "MELTA")
    ),
    showLongRange: profiles.some((w) =>
      w.abilities.some((a) => a.type === "CONVERSION")
    ),
  };
};

type Props = {
  idPrefix: string;
  context: AttackerContext;
  flags: ReturnType<typeof relevantContextFlags>;
  onChange: (ctx: AttackerContext) => void;
};

export const AttackerContextSection = ({
  idPrefix,
  context,
  flags,
  onChange,
}: Props) => {
  const { showStationary, showCharged, showHalfRange, showLongRange } = flags;
  if (!showStationary && !showCharged && !showHalfRange && !showLongRange)
    return null;

  return (
    <Stack gap="xs">
      <label className={styles.conditionsLabel}>Conditions</label>
      <Stack gap="4px">
        {showStationary && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-stationary`}
            checked={context.remainedStationary}
            onChange={(e) =>
              onChange({
                ...context,
                remainedStationary: e.currentTarget.checked,
              })
            }
            label={
              <>
                Remained Stationary{" "}
                <span className={styles.hint}>(Heavy +1 to hit)</span>
              </>
            }
          />
        )}
        {showCharged && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-charged`}
            checked={context.charged}
            onChange={(e) =>
              onChange({ ...context, charged: e.currentTarget.checked })
            }
            label={
              <>
                Charged this turn{" "}
                <span className={styles.hint}>(Lance +1 to wound)</span>
              </>
            }
          />
        )}
        {showHalfRange && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-halfrange`}
            checked={context.atHalfRange}
            onChange={(e) =>
              onChange({ ...context, atHalfRange: e.currentTarget.checked })
            }
            label={
              <>
                At half range{" "}
                <span className={styles.hint}>(Rapid Fire / Melta)</span>
              </>
            }
          />
        )}
        {showLongRange && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-longrange`}
            checked={context.atLongRange}
            onChange={(e) =>
              onChange({ ...context, atLongRange: e.currentTarget.checked })
            }
            label={
              <>
                At long range{" "}
                <span className={styles.hint}>(Conversion crits on 4+)</span>
              </>
            }
          />
        )}
      </Stack>
    </Stack>
  );
};
