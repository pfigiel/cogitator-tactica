"use client";

import { CombatResult, DirectionalResult, WeaponResult } from "@/lib/calculator/types";
import { Table, Alert, Stack, Group } from "@/ui";

interface Props {
  result: CombatResult;
}

function WeaponTable({ weaponResult }: { weaponResult: WeaponResult }) {
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
}

function DirectionTable({
  result,
  title,
  color,
}: {
  result: DirectionalResult;
  title: string;
  color: string;
}) {
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
}

export default function ResultsDisplay({ result }: Props) {
  return (
    <Stack gap="xl">
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderBottom: "1px solid var(--mantine-color-dark-4)",
          paddingBottom: "8px",
          margin: 0,
        }}
      >
        Results —{" "}
        {result.phase === "shooting" ? "Shooting Phase" : "Fight Phase"}
      </h2>

      {result.firstFighterNote && (
        <Alert color="yellow" variant="light">
          {result.firstFighterNote}
        </Alert>
      )}

      <DirectionTable
        result={result.primary}
        title={result.phase === "melee" ? "Primary Attack" : "Attack"}
        color="var(--mantine-color-yellow-4)"
      />

      {result.counterattack && (
        <DirectionTable
          result={result.counterattack}
          title="Counterattack"
          color="var(--mantine-color-blue-4)"
        />
      )}
    </Stack>
  );
}
