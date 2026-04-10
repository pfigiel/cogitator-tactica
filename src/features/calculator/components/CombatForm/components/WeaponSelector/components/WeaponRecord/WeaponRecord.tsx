import type { WeaponProfile } from "@/lib/calculator/types";
import type { MantineColor } from "@mantine/core";
import { Paper, Group, Stack, Button, NumberInput } from "@/ui";
import { formatStats, formatAbilities } from "./weaponFormatters";

interface SelectionProps {
  modelCount: number;
  onCountChange: (count: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

interface WeaponRecordProps {
  weapon: WeaponProfile;
  weaponType: "shooting" | "melee";
  color: MantineColor;
  isSelected: boolean;
  onToggle: () => void;
  selectionProps?: SelectionProps;
}

export const WeaponRecord = ({
  weapon,
  weaponType,
  color,
  isSelected,
  onToggle,
  selectionProps,
}: WeaponRecordProps) => {
  const stats = formatStats(weapon, weaponType);
  const abilities = formatAbilities(weapon.abilities);

  return (
    <Paper withBorder p="xs">
      <Group wrap="nowrap" align="center" gap="xs">
        <Button
          size="compact-xs"
          variant="subtle"
          color={color}
          onClick={onToggle}
          aria-label={isSelected ? `Remove ${weapon.name}` : `Add ${weapon.name}`}
          style={{ flexShrink: 0 }}
        >
          {isSelected ? "−" : "+"}
        </Button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {weapon.name}
          </div>
          <div style={{ fontSize: "11px" }}>
            {stats.map(({ label, value }) => (
              <span key={label}>
                <span style={{ color: "var(--mantine-color-dimmed)" }}>{label}</span>
                <span style={{ color: "var(--mantine-color-yellow-filled)" }}>{value}</span>{" "}
              </span>
            ))}
          </div>
          {abilities && (
            <div style={{ fontSize: "11px", color: "var(--mantine-color-dimmed)" }}>
              {abilities}
            </div>
          )}
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
                selectionProps.onCountChange(typeof val === "number" ? Math.max(1, val) : 1)
              }
              style={{ flexShrink: 0 }}
            />
            <Stack gap="2px" style={{ flexShrink: 0 }}>
              <Button
                size="compact-xs"
                variant="subtle"
                color={color}
                onClick={selectionProps.onMoveUp}
                disabled={selectionProps.isFirst}
                aria-label={`Move ${weapon.name} up`}
              >
                ▲
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                color={color}
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
