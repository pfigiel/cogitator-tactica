import { DirectionalResult } from "@/lib/calculator/types";
import { Stack, Group } from "@/ui";
import { WeaponTable } from "../WeaponTable/WeaponTable";

export const DirectionTable = ({
  result,
  title,
  color,
}: {
  result: DirectionalResult;
  title: string;
  color: string;
}) => {
  const multiWeapon = result.weaponResults.length > 1;

  return (
    <Stack gap="sm">
      <h3 style={{ fontWeight: 700, fontSize: "18px", color, margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", color: "var(--mantine-color-dimmed)", margin: 0 }}>
        {result.attackerName} → {result.defenderName}
      </p>
      <Stack gap="lg">
        {result.weaponResults.map((wr) => (
          <WeaponTable key={wr.weaponName} weaponResult={wr} />
        ))}
      </Stack>
      <div
        style={{
          paddingTop: "8px",
          borderTop: "1px solid var(--mantine-color-dark-4)",
        }}
      >
        {multiWeapon && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--mantine-color-dimmed)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Combined totals
          </p>
        )}
        <Group gap="xl">
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--mantine-color-dimmed)",
                textTransform: "uppercase",
              }}
            >
              Avg Damage
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--mantine-color-yellow-4)",
              }}
            >
              {result.totalAverageDamage.toFixed(2)}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--mantine-color-dimmed)",
                textTransform: "uppercase",
              }}
            >
              Avg Models Slain
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--mantine-color-red-4)",
              }}
            >
              {result.totalAverageModelsSlain.toFixed(2)}
            </div>
          </div>
        </Group>
      </div>
    </Stack>
  );
};
