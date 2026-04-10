"use client";

import { CombatResult } from "@/lib/calculator/types";
import { Alert, Stack } from "@/ui";
import { DirectionTable } from "./components/DirectionTable/DirectionTable";

interface Props {
  result: CombatResult;
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
