"use client";

import { CombatResult } from "@/lib/calculator/types";
import { Alert, Stack } from "@/ui";
import { DirectionTable } from "./components/DirectionTable/DirectionTable";
import styles from "./ResultsDisplay.module.css";

type Props = {
  result: CombatResult;
};

const ResultsDisplay = ({ result }: Props) => {
  return (
    <Stack gap="xl">
      <h2 className={styles.heading}>
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
