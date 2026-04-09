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
import PromptInput from "@/components/PromptInput";
import CombatForm from "@/components/CombatForm";
import ResultsDisplay from "@/components/ResultsDisplay";

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

/** Resolve form weapon selections to concrete WeaponProfile + modelCount pairs. */
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
      return weapon ? { weapon, modelCount: sw.modelCount ?? defaultModelCount } : null;
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
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <header className="text-center space-y-1">
        <h1 className="text-4xl font-black uppercase tracking-widest text-amber-500">
          WH40K Battle Calc
        </h1>
        <p className="text-gray-400 text-sm">Statistics calculator for Warhammer 40,000 10th Edition</p>
      </header>

      {/* Prompt input */}
      <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <PromptInput onParsed={(parsed) => setForm(parsed)} />
      </section>

      {/* Form */}
      <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <CombatForm
          state={form}
          onChange={setForm}
          onCalculate={handleCalculate}
        />
        {error && (
          <p className="mt-3 text-red-400 text-sm">Error: {error}</p>
        )}
      </section>

      {/* Results */}
      {result && (
        <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <ResultsDisplay result={result} />
        </section>
      )}
    </main>
  );
}
