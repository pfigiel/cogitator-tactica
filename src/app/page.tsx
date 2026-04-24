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
import { Accordion, Paper, Stack } from "@/ui";
import styles from "./page.module.css";

const DEFAULT_FORM: CombatFormState = {
  phase: "shooting",
  attackerUnitId: "intercessor_squad",
  attackerCount: 10,
  attackerWeapons: [{ weaponId: "bolt_rifle" }],
  attackerContext: DEFAULT_ATTACKER_CONTEXT,
  defenderUnitId: "boyz",
  defenderCount: 20,
  defenderInCover: false,
  defenderWeapons: [{ weaponId: "choppa_3f38e6" }],
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
      const weapon = pool.find((w) => w.id === sw.weaponId);
      return weapon
        ? { weapon, modelCount: sw.modelCount ?? defaultModelCount }
        : null;
    })
    .filter((x): x is SelectedWeaponInput => x !== null);
};

const ACCORDION_VALUE = "combat-parameters";

const Home = () => {
  const [form, setForm] = useState<CombatFormState>(DEFAULT_FORM);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const [unitList, setUnitList] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const unitsRef = useRef<Record<string, UnitProfile>>({});
  const [units, setUnits] = useState<Record<string, UnitProfile>>({});
  const accordionRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const setUnitsAndRef = (
    updater: (prev: Record<string, UnitProfile>) => Record<string, UnitProfile>,
  ) => {
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
      .catch(() => {
        /* non-fatal: dropdown stays empty */
      });
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

  useEffect(() => {
    ensureUnit(DEFAULT_FORM.attackerUnitId);
    ensureUnit(DEFAULT_FORM.defenderUnitId);
  }, []);

  const runCalculation = async (formState: CombatFormState) => {
    setError(null);
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
      setError("No valid defender weapons selected for melee counterattack.");
      return;
    }

    try {
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
    }
  };

  useEffect(() => {
    if (accordionValue) {
      accordionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [accordionValue]);

  useEffect(() => {
    if (result) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const handleCalculate = async () => {
    await runCalculation(form);
  };

  const handleFormChange = useCallback(
    (next: CombatFormState) => {
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

  const handleParsedFromPrompt = useCallback(
    (nextForm: CombatFormState) => {
      handleFormChange(nextForm);
      setAccordionValue(ACCORDION_VALUE);
    },
    [handleFormChange],
  );

  const handleSimulateFromPrompt = useCallback(
    async (nextForm: CombatFormState) => {
      handleFormChange(nextForm);
      await runCalculation(nextForm);
    },
    [handleFormChange],
  );

  return (
    <main className={styles.main}>
      <Stack gap="xl">
        <PromptInput
          className={styles.promptInput}
          onParsed={handleParsedFromPrompt}
          onSimulate={handleSimulateFromPrompt}
        />

        <div ref={accordionRef}>
          <Accordion value={accordionValue} onChange={setAccordionValue}>
            <Accordion.Item value={ACCORDION_VALUE}>
              <Accordion.Control>Combat Parameters</Accordion.Control>
              <Accordion.Panel>
                <CombatForm
                  state={form}
                  onChange={handleFormChange}
                  onCalculate={handleCalculate}
                  units={units}
                  unitList={unitList}
                />
                {error && <p className={styles.error}>Error: {error}</p>}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>

        {result && (
          <div ref={resultsRef}>
            <Paper>
              <ResultsDisplay result={result} />
            </Paper>
          </div>
        )}
      </Stack>
    </main>
  );
};

export default Home;
