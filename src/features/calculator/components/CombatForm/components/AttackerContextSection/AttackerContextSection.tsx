import { AttackerContext, SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Checkbox, Stack } from "@/ui";

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

export const AttackerContextSection = ({
  idPrefix,
  context,
  flags,
  color,
  onChange,
}: {
  idPrefix: string;
  context: AttackerContext;
  flags: ReturnType<typeof relevantContextFlags>;
  color: string;
  onChange: (ctx: AttackerContext) => void;
}) => {
  const { showStationary, showCharged, showHalfRange, showLongRange } = flags;
  if (!showStationary && !showCharged && !showHalfRange && !showLongRange)
    return null;

  return (
    <Stack gap="xs">
      <label style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
        Conditions
      </label>
      <Stack gap="4px">
        {showStationary && (
          <Checkbox
            color={color}
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
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  (Heavy +1 to hit)
                </span>
              </>
            }
          />
        )}
        {showCharged && (
          <Checkbox
            color={color}
            id={`${idPrefix}-charged`}
            checked={context.charged}
            onChange={(e) =>
              onChange({ ...context, charged: e.currentTarget.checked })
            }
            label={
              <>
                Charged this turn{" "}
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  (Lance +1 to wound)
                </span>
              </>
            }
          />
        )}
        {showHalfRange && (
          <Checkbox
            color={color}
            id={`${idPrefix}-halfrange`}
            checked={context.atHalfRange}
            onChange={(e) =>
              onChange({ ...context, atHalfRange: e.currentTarget.checked })
            }
            label={
              <>
                At half range{" "}
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  (Rapid Fire / Melta)
                </span>
              </>
            }
          />
        )}
        {showLongRange && (
          <Checkbox
            color={color}
            id={`${idPrefix}-longrange`}
            checked={context.atLongRange}
            onChange={(e) =>
              onChange({ ...context, atLongRange: e.currentTarget.checked })
            }
            label={
              <>
                At long range{" "}
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--mantine-color-dimmed)",
                  }}
                >
                  (Conversion crits on 4+)
                </span>
              </>
            }
          />
        )}
      </Stack>
    </Stack>
  );
};
