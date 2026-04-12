"use client";

import { CombatResult } from "@/lib/calculator/types";
import { Alert, Stack } from "@/ui";
import { DirectionTable } from "./components/DirectionTable/DirectionTable";

interface Props {
  result: CombatResult;
}

const ResultsDisplay = ({ result }: Props) => {
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
      />

      {result.counterattack && (
        <DirectionTable
          result={result.counterattack}
          title="Counterattack"
        />
      )}
    </Stack>
  );
};

export default ResultsDisplay;
