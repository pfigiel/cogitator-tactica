import { SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Button, NumberInput, Stack, Group } from "@/ui";

const weaponStats = (w: WeaponProfile): string => {
  return `A${w.attacks} S${w.strength} AP-${w.ap} D${w.damage}`;
};

export const WeaponSelector = ({
  weapons,
  selected,
  defaultModelCount,
  color,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  color: string;
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}) => {
  if (weapons.length === 0) return null;

  const selectedWeapons = selected
    .map((s) => weapons.find((w) => w.name === s.weaponName))
    .filter((w): w is WeaponProfile => w !== undefined);

  const availableWeapons = weapons.filter(
    (w) => !selected.some((s) => s.weaponName === w.name)
  );

  const dimmed = { fontSize: "12px", color: "var(--mantine-color-dimmed)" };

  return (
    <Stack gap="xs">
      {/* Selected weapons */}
      <Stack gap="xs">
        <span style={dimmed}>Selected weapons</span>
        {selectedWeapons.length === 0 ? (
          <span style={dimmed}>No weapons selected</span>
        ) : (
          selectedWeapons.map((w) => {
            const selIdx = selected.findIndex((s) => s.weaponName === w.name);
            const count = selected[selIdx].modelCount ?? defaultModelCount;
            const isFirst = selIdx === 0;
            const isLast = selIdx === selected.length - 1;

            return (
              <Group key={w.name} gap="xs" wrap="wrap">
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color={color}
                  onClick={() => onToggle(w.name)}
                  aria-label={`Remove ${w.name}`}
                >
                  −
                </Button>
                <span>
                  {w.name}
                  <span style={{ marginLeft: "8px", ...dimmed }}>
                    {weaponStats(w)}
                  </span>
                </span>
                <Group gap="xs" align="center">
                  <span style={dimmed}>models:</span>
                  <NumberInput
                    size="xs"
                    w={70}
                    min={1}
                    max={500}
                    value={count}
                    onChange={(val) =>
                      onCountChange(
                        w.name,
                        typeof val === "number" ? Math.max(1, val) : 1
                      )
                    }
                  />
                  {selected.length > 1 && (
                    <Stack gap="2px">
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color={color}
                        onClick={() => onMoveUp(w.name)}
                        disabled={isFirst}
                        aria-label={`Move ${w.name} up`}
                      >
                        ▲
                      </Button>
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color={color}
                        onClick={() => onMoveDown(w.name)}
                        disabled={isLast}
                        aria-label={`Move ${w.name} down`}
                      >
                        ▼
                      </Button>
                    </Stack>
                  )}
                </Group>
              </Group>
            );
          })
        )}
      </Stack>

      {/* Available weapons */}
      <Stack gap="xs">
        <span style={dimmed}>Available weapons</span>
        {availableWeapons.length === 0 ? (
          <span style={dimmed}>No weapons available</span>
        ) : (
          availableWeapons.map((w) => (
            <Group key={w.name} gap="xs">
              <Button
                size="compact-xs"
                variant="subtle"
                color={color}
                onClick={() => onToggle(w.name)}
                aria-label={`Add ${w.name}`}
              >
                +
              </Button>
              <span>
                {w.name}
                <span style={{ marginLeft: "8px", ...dimmed }}>
                  {weaponStats(w)}
                </span>
              </span>
            </Group>
          ))
        )}
      </Stack>
    </Stack>
  );
};
