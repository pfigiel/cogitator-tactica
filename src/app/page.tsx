"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import PromptInput from "@/features/calculator/components/PromptInput/PromptInput";
import CombatForm from "@/features/calculator/components/CombatForm/CombatForm";
import ResultsDisplay from "@/features/calculator/components/ResultsDisplay/ResultsDisplay";
import { Paper, Stack } from "@/ui";
import styles from "./page.module.css";

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

const resolveWeapons = (
  unit: UnitProfile,
  phase: Phase,
  selectedWeapons: SelectedWeapon[],
  defaultModelCount: number,
): SelectedWeaponInput[] => {
  const pool = phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
  return selectedWeapons
    .map((sw) => {
      const weapon = pool.find((w) => w.name === sw.weaponName);
      return weapon
        ? { weapon, modelCount: sw.modelCount ?? defaultModelCount }
        : null;
    })
    .filter((x): x is SelectedWeaponInput => x !== null);
};

const Home = () => {
  const [form, setForm] = useState<CombatFormState>(DEFAULT_FORM);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unitList, setUnitList] = useState<Array<{ id: string; name: string }>>([]);
  const unitsRef = useRef<Record<string, UnitProfile>>({});
  const [units, setUnits] = useState<Record<string, UnitProfile>>({});

  const setUnitsAndRef = (updater: (prev: Record<string, UnitProfile>) => Record<string, UnitProfile>) => {
    setUnits((prev) => {
      const next = updater(prev);
      unitsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    fetch("/api/units")
      .then((r) => r.json())
      .then((list: Array<{ id: string; name: string }>) => setUnitList(list))
      .catch(() => {/* non-fatal: dropdown stays empty */});
  }, []);

  const ensureUnit = useCallback(
    async (id: string): Promise<UnitProfile | null> => {
      if (unitsRef.current[id]) return unitsRef.current[id];
      try {
        const res = await fetch(`/api/units/${id}`);
        if (!res.ok) return null;
        const unit: UnitProfile = await res.json();
        setUnitsAndRef((prev) => ({ ...prev, [id]: unit }));
        return unit;
      } catch {
        return null;
      }
    },
    [],
  );

  // Pre-fetch the default units on mount so the form has weapon pools immediately
  useEffect(() => {
    ensureUnit(DEFAULT_FORM.attackerUnitId);
    ensureUnit(DEFAULT_FORM.defenderUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalculate = async () => {
    setError(null);
    const [attacker, defender] = await Promise.all([
      ensureUnit(form.attackerUnitId),
      ensureUnit(form.defenderUnitId),
    ]);

    if (!attacker || !defender) {
      setError("Unknown unit selected.");
      return;
    }

    const attackerWeapons = resolveWeapons(
      attacker,
      form.phase,
      form.attackerWeapons,
      form.attackerCount,
    );
    const defenderWeapons = resolveWeapons(
      defender,
      "melee",
      form.defenderWeapons,
      form.defenderCount,
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
            },
      );
      setResult(combatResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  };

  const handleFormChange = useCallback(
    async (next: CombatFormState) => {
      // Pre-fetch any newly selected unit so weapon pools are ready
      if (next.attackerUnitId !== form.attackerUnitId) {
        ensureUnit(next.attackerUnitId);
      }
      if (next.defenderUnitId !== form.defenderUnitId) {
        ensureUnit(next.defenderUnitId);
      }
      setForm(next);
    },
    [form.attackerUnitId, form.defenderUnitId, ensureUnit],
  );

  return (
    <main className={styles.main}>
      <Stack gap="xl">
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>WH40K Battle Calc</h1>
          <p className={styles.subtitle}>
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
            onChange={handleFormChange}
            onCalculate={handleCalculate}
            units={units}
            unitList={unitList}
          />
          {error && (
            <p className={styles.error}>Error: {error}</p>
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
};

export default Home;
