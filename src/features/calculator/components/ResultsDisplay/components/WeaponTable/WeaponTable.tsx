import { WeaponResult } from "@/lib/calculator/types";
import { Table, Stack, Group } from "@/ui";

export const WeaponTable = ({ weaponResult }: { weaponResult: WeaponResult }) => {
  return (
    <Stack gap="xs">
      <Group gap="xs" align="baseline">
        <h4 style={{ fontWeight: 600, fontSize: "14px", margin: 0 }}>
          {weaponResult.weaponName}
        </h4>
        <span style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
          {weaponResult.modelCount} model(s)
        </span>
      </Group>
      <Table striped highlightOnHover withRowBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ fontSize: "12px" }}>Step</Table.Th>
            <Table.Th style={{ textAlign: "right", fontSize: "12px" }}>Input</Table.Th>
            <Table.Th style={{ textAlign: "right", fontSize: "12px" }}>Average</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {weaponResult.steps.map((step, i) => (
            <Table.Tr key={i}>
              <Table.Td style={{ fontSize: "12px" }}>{step.label}</Table.Td>
              <Table.Td
                style={{
                  textAlign: "right",
                  fontSize: "12px",
                  color: "var(--mantine-color-dimmed)",
                }}
              >
                {step.input.toFixed(2)}
              </Table.Td>
              <Table.Td
                style={{
                  textAlign: "right",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--mantine-color-yellow-4)",
                }}
              >
                {step.average.toFixed(2)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group gap="lg" style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
        <span>
          Damage:{" "}
          <span style={{ color: "var(--mantine-color-yellow-4)", fontWeight: 700 }}>
            {weaponResult.averageDamage.toFixed(2)}
          </span>
        </span>
        <span>
          Models Slain:{" "}
          <span style={{ color: "var(--mantine-color-red-4)", fontWeight: 700 }}>
            {weaponResult.averageModelsSlain.toFixed(2)}
          </span>
        </span>
      </Group>
    </Stack>
  );
};
