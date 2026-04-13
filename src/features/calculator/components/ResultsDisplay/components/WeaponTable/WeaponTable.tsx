import { WeaponResult } from "@/lib/calculator/types";
import { Table, Stack, Group } from "@/ui";
import styles from "./WeaponTable.module.css";

type Props = {
  weaponResult: WeaponResult;
};

export const WeaponTable = ({ weaponResult }: Props) => (
    <Stack gap="xs">
      <Group gap="xs" align="baseline">
        <h4 className={styles.weaponName}>{weaponResult.weaponName}</h4>
        <span className={styles.modelCount}>{weaponResult.modelCount} model(s)</span>
      </Group>
      <Table striped highlightOnHover withRowBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th className={styles.th}>Step</Table.Th>
            <Table.Th className={styles.thRight}>Input</Table.Th>
            <Table.Th className={styles.thRight}>Average</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {weaponResult.steps.map((step, i) => (
            <Table.Tr key={i}>
              <Table.Td className={styles.td}>{step.label}</Table.Td>
              <Table.Td className={styles.tdInput}>{step.input.toFixed(2)}</Table.Td>
              <Table.Td className={styles.tdAverage}>{step.average.toFixed(2)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group gap="lg" className={styles.summary}>
        <span>
          Damage:{" "}
          <span className={styles.damageValue}>
            {weaponResult.averageDamage.toFixed(2)}
          </span>
        </span>
        <span>
          Models Slain:{" "}
          <span className={styles.modelsSlainValue}>
            {weaponResult.averageModelsSlain.toFixed(2)}
          </span>
        </span>
      </Group>
    </Stack>
  );
