import { DirectionalResult } from "@/lib/calculator/types";
import { Stack, Group } from "@/ui";
import { WeaponTable } from "../WeaponTable/WeaponTable";
import styles from "./DirectionTable.module.css";

export const DirectionTable = ({
  result,
  title,
}: {
  result: DirectionalResult;
  title: string;
}) => {
  const multiWeapon = result.weaponResults.length > 1;

  return (
    <Stack gap="sm">
      <h3 className={styles.heading}>{title}</h3>
      <p className={styles.subtitle}>
        {result.attackerName} → {result.defenderName}
      </p>
      <Stack gap="lg">
        {result.weaponResults.map((wr) => (
          <WeaponTable key={wr.weaponName} weaponResult={wr} />
        ))}
      </Stack>
      <div className={styles.totalsSection}>
        {multiWeapon && (
          <p className={styles.combinedLabel}>Combined totals</p>
        )}
        <Group gap="xl">
          <div>
            <div className={styles.statLabel}>Avg Damage</div>
            <div className={styles.damageValue}>
              {result.totalAverageDamage.toFixed(2)}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>Avg Models Slain</div>
            <div className={styles.modelsSlainValue}>
              {result.totalAverageModelsSlain.toFixed(2)}
            </div>
          </div>
        </Group>
      </div>
    </Stack>
  );
};
