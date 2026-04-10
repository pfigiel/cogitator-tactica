"use client";

import { useState } from "react";
import {
  CombatFormState,
  CombatResult,
  Phase,
  SelectedWeapon,
  SelectedWeaponInput,
  UnitProfile,
  DEFAULT_ATTACKER_CONTEXT,
} from "@/lib/calculator/types";
import { calculate } from "@/lib/calculator";
import { UNITS } from "@/data/units";
import PromptInput from "@/features/calculator/components/PromptInput/PromptInput";
import CombatForm from "@/features/calculator/components/CombatForm/CombatForm";
import ResultsDisplay from "@/features/calculator/components/ResultsDisplay/ResultsDisplay";
import { Paper, Stack } from "@/ui";

const DEFAULT_FORM: CombatFormState = {
  phase: "shooting",
  attackerUnitId: "intercessor_squad",
  attackerCount: 10,
  attackerWeapons: [{ weaponName: "Bolt Rifle" }],
  attackerContext: DEFAULT_ATTACKER_CONTEXT,
  defenderUnitId: "boyz_boy",
  defenderCount: 20,
  defenderInCover: false,
  defenderWeapons: [{ weaponName: "Choppa" }],
  defenderContext: DEFAULT_ATTACKER_CONTEXT,
  firstFighter: "attacker",
};

function resolveWeapons(
  unit: UnitProfile,
  phase: Phase,
  selectedWeapons: SelectedWeapon[],
  defaultModelCount: number
): SelectedWeaponInput[] {
  const pool = phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
  return selectedWeapons
    .map((sw) => {
      const weapon = pool.find((w) => w.name === sw.weaponName);
      return weapon
        ? { weapon, modelCount: sw.modelCount ?? defaultModelCount }
        : null;
    })
    .filter((x): x is SelectedWeaponInput => x !== null);
}

export default function Home() {
  const [form, setForm] = useState<CombatFormState>(DEFAULT_FORM);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCalculate() {
    setError(null);
    const attacker = UNITS[form.attackerUnitId];
    const defender = UNITS[form.defenderUnitId];

    if (!attacker || !defender) {
      setError("Unknown unit selected.");
      return;
    }

    const attackerWeapons = resolveWeapons(
      attacker,
      form.phase,
      form.attackerWeapons,
      form.attackerCount
    );
    const defenderWeapons = resolveWeapons(
      defender,
      "melee",
      form.defenderWeapons,
      form.defenderCount
    );

    if (attackerWeapons.length === 0) {
      setError("No valid attacker weapons selected.");
      return;
    }
    if (form.phase === "melee" && defenderWeapons.length === 0) {
      setError("No valid defender weapons selected for melee counterattack.");
      return;
    }

    try {
      const combatResult = await calculate(
        form.phase === "shooting"
          ? {
              phase: "shooting",
              attacker: {
                unit: attacker,
                modelCount: form.attackerCount,
                attackerContext: form.attackerContext,
                selectedWeapons: attackerWeapons,
              },
              defender: {
                unit: defender,
                modelCount: form.defenderCount,
                defenderContext: { inCover: form.defenderInCover },
                selectedWeapons: defenderWeapons,
              },
            }
          : {
              phase: "melee",
              attacker: {
                unit: attacker,
                modelCount: form.attackerCount,
                attackerContext: form.attackerContext,
                selectedWeapons: attackerWeapons,
              },
              defender: {
                unit: defender,
                modelCount: form.defenderCount,
                defenderContext: { inCover: form.defenderInCover },
                attackerContext: form.defenderContext,
                selectedWeapons: defenderWeapons,
              },
              firstFighter: form.firstFighter,
            }
      );
      setResult(combatResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  }

  return (
    <main style={{ maxWidth: "896px", margin: "0 auto", padding: "40px 16px" }}>
      <Stack gap="xl">
        {/* Header */}
        <header style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--mantine-color-yellow-4)",
              margin: 0,
            }}
          >
            WH40K Battle Calc
          </h1>
          <p
            style={{
              color: "var(--mantine-color-dimmed)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Statistics calculator for Warhammer 40,000 10th Edition
          </p>
        </header>

        {/* Prompt input */}
        <Paper>
          <PromptInput onParsed={(parsed) => setForm(parsed)} />
        </Paper>

        {/* Form */}
        <Paper>
          <CombatForm
            state={form}
            onChange={setForm}
            onCalculate={handleCalculate}
          />
          {error && (
            <p
              style={{
                marginTop: "12px",
                color: "var(--mantine-color-red-4)",
                fontSize: "14px",
              }}
            >
              Error: {error}
            </p>
          )}
        </Paper>

        {/* Results */}
        {result && (
          <Paper>
            <ResultsDisplay result={result} />
          </Paper>
        )}
      </Stack>
    </main>
  );
}
