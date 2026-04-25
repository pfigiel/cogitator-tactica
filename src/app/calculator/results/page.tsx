"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CombatFormState,
  CombatResult,
  Phase,
  SelectedWeapon,
  SelectedWeaponInput,
  UnitProfile,
} from "@/lib/calculator/types";
import { calculate } from "@/lib/calculator";
import { useCalculator } from "@/features/calculator/context/CalculatorContext";
import PromptInput from "@/features/calculator/components/PromptInput/PromptInput";
import CombatForm from "@/features/calculator/components/CombatForm/CombatForm";
import ResultsDisplay from "@/features/calculator/components/ResultsDisplay/ResultsDisplay";
import { Accordion, Paper, Stack } from "@/ui";
import styles from "./page.module.css";

const ACCORDION_VALUE = "combat-parameters";

const resolveWeapons = (
  unit: UnitProfile,
  phase: Phase,
  selectedWeapons: SelectedWeapon[],
  defaultModelCount: number,
): SelectedWeaponInput[] => {
  const pool = phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
  return selectedWeapons
    .map((sw) => {
      const weapon = pool.find((w) => w.id === sw.weaponId);
      return weapon
        ? { weapon, modelCount: sw.modelCount ?? defaultModelCount }
        : null;
    })
    .filter((x): x is SelectedWeaponInput => x !== null);
};

const ResultsPage = () => {
  const router = useRouter();
  const { handoff, setHandoff } = useCalculator();

  const [form, setForm] = useState<CombatFormState | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<CombatResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const unitsRef = useRef<Record<string, UnitProfile>>({});

  const ensureUnit = useCallback(
    async (id: string): Promise<UnitProfile | null> => {
      if (unitsRef.current[id]) return unitsRef.current[id];
      try {
        const res = await fetch(`/api/units/${id}`);
        if (!res.ok) return null;
        const unit: UnitProfile = await res.json();
        unitsRef.current = { ...unitsRef.current, [id]: unit };
        return unit;
      } catch {
        return null;
      }
    },
    [],
  );

  const runCalculation = useCallback(
    async (formState: CombatFormState) => {
      setCalculating(true);
      setError(null);
      try {
        const [attacker, defender] = await Promise.all([
          ensureUnit(formState.attackerUnitId),
          ensureUnit(formState.defenderUnitId),
        ]);
        if (!attacker || !defender) {
          setError("Unknown unit selected.");
          return;
        }
        const attackerWeapons = resolveWeapons(
          attacker,
          formState.phase,
          formState.attackerWeapons,
          formState.attackerCount,
        );
        const defenderWeapons = resolveWeapons(
          defender,
          "melee",
          formState.defenderWeapons,
          formState.defenderCount,
        );
        if (attackerWeapons.length === 0) {
          setError("No valid attacker weapons selected.");
          return;
        }
        if (formState.phase === "melee" && defenderWeapons.length === 0) {
          setError(
            "No valid defender weapons selected for melee counterattack.",
          );
          return;
        }
        const combatResult = await calculate(
          formState.phase === "shooting"
            ? {
                phase: "shooting",
                attacker: {
                  unit: attacker,
                  modelCount: formState.attackerCount,
                  attackerContext: formState.attackerContext,
                  selectedWeapons: attackerWeapons,
                },
                defender: {
                  unit: defender,
                  modelCount: formState.defenderCount,
                  defenderContext: { inCover: formState.defenderInCover },
                  selectedWeapons: defenderWeapons,
                },
              }
            : {
                phase: "melee",
                attacker: {
                  unit: attacker,
                  modelCount: formState.attackerCount,
                  attackerContext: formState.attackerContext,
                  selectedWeapons: attackerWeapons,
                },
                defender: {
                  unit: defender,
                  modelCount: formState.defenderCount,
                  defenderContext: { inCover: formState.defenderInCover },
                  attackerContext: formState.defenderContext,
                  selectedWeapons: defenderWeapons,
                },
                firstFighter: formState.firstFighter,
              },
        );
        setResult(combatResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Calculation failed");
      } finally {
        setCalculating(false);
      }
    },
    [ensureUnit],
  );

  useEffect(() => {
    if (!handoff) {
      router.replace("/calculator");
      return;
    }
    setForm(handoff.form);
    setPrompt(handoff.prompt);
    setAccordionValue(handoff.autoSubmit ? null : ACCORDION_VALUE);
    ensureUnit(handoff.form.attackerUnitId);
    ensureUnit(handoff.form.defenderUnitId);
    if (handoff.autoSubmit) {
      runCalculation(handoff.form);
    }
  }, [ensureUnit, runCalculation]);

  const handleFormChange = useCallback((next: CombatFormState) => {
    setForm(next);
  }, []);

  const handleCalculate = useCallback(async () => {
    if (form) await runCalculation(form);
  }, [form, runCalculation]);

  const handleParsed = useCallback(
    (nextForm: CombatFormState, nextPrompt: string) => {
      setForm(nextForm);
      setPrompt(nextPrompt);
      setResult(null);
      setAccordionValue(ACCORDION_VALUE);
      setHandoff({ form: nextForm, prompt: nextPrompt, autoSubmit: false });
      ensureUnit(nextForm.attackerUnitId);
      ensureUnit(nextForm.defenderUnitId);
    },
    [setHandoff, ensureUnit],
  );

  const handleSimulate = useCallback(
    async (nextForm: CombatFormState, nextPrompt: string) => {
      setForm(nextForm);
      setPrompt(nextPrompt);
      setResult(null);
      setAccordionValue(null);
      setHandoff({ form: nextForm, prompt: nextPrompt, autoSubmit: true });
      await runCalculation(nextForm);
    },
    [setHandoff, runCalculation],
  );

  if (!form) return null;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Stack gap="xl">
          <Accordion value={accordionValue} onChange={setAccordionValue}>
            <Accordion.Item value={ACCORDION_VALUE}>
              <Accordion.Control>Combat Parameters</Accordion.Control>
              <Accordion.Panel>
                <CombatForm
                  state={form}
                  onChange={handleFormChange}
                  onCalculate={handleCalculate}
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          {error && <p className={styles.error}>Error: {error}</p>}

          {calculating ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyHeading}>Computing…</span>
            </div>
          ) : result ? (
            <Paper>
              <ResultsDisplay result={result} />
            </Paper>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⚙</span>
              <p className={styles.emptyHeading}>Awaiting calculation</p>
              <p className={styles.emptyHint}>
                Review the parameters above, then hit Calculate or use the
                Engage button below.
              </p>
            </div>
          )}
        </Stack>
      </div>

      <div className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          <PromptInput
            compact
            initialPrompt={prompt}
            onParsed={handleParsed}
            onSimulate={handleSimulate}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
