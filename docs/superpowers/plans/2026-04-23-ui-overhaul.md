# UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visually overhaul Cogitator Tactica: centered atmospheric prompt input, collapsible form accordion, lore-friendly copy, icon-augmented phase selector, and auto-scroll to results.

**Architecture:** The prompt section is redesigned as a centered focal point with a new `onSimulate` callback. `CombatForm` is wrapped in a controlled Mantine `Accordion` in `page.tsx`, which expands automatically after parse. Auto-scroll is implemented via refs in `page.tsx` after state updates.

**Tech Stack:** Next.js 16, React 19, Mantine 9, `@tabler/icons-react`, TypeScript, CSS Modules, Vitest

---

## File Map

**Created:**

- `src/ui/Textarea/Textarea.tsx` — thin Mantine Textarea wrapper
- `src/ui/Textarea/index.ts` — re-export
- `src/ui/Accordion/Accordion.tsx` — thin Mantine Accordion wrapper
- `src/ui/Accordion/index.ts` — re-export

**Modified:**

- `src/ui/index.ts` — add Textarea and Accordion exports
- `src/app/page.tsx` — refs, accordion state, runCalculation, new callbacks, Accordion wrap
- `src/app/page.module.css` — header restyle
- `src/features/calculator/components/PromptInput/PromptInput.tsx` — full redesign
- `src/features/calculator/components/PromptInput/PromptInput.module.css` — new styles
- `src/features/calculator/components/CombatForm/CombatForm.tsx` — phase selector icons, calculate button
- `src/features/calculator/components/CombatForm/CombatForm.module.css` — phase selector styles
- `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx` — darker panel bg, gradient color

---

## Task 1: Install icon library

**Files:**

- Modify: `package.json` (via npm)

- [ ] **Step 1: Install `@tabler/icons-react`**

```bash
npm install @tabler/icons-react
```

Expected output: package added, no peer-dep errors.

- [ ] **Step 2: Verify the package resolves**

```bash
node -e "require('@tabler/icons-react')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @tabler/icons-react"
```

---

## Task 2: Add `Textarea` UI wrapper

**Files:**

- Create: `src/ui/Textarea/Textarea.tsx`
- Create: `src/ui/Textarea/index.ts`
- Modify: `src/ui/index.ts`

- [ ] **Step 1: Create `src/ui/Textarea/Textarea.tsx`**

```tsx
import {
  Textarea as MantineTextarea,
  TextareaProps,
  ElementProps,
} from "@mantine/core";

type Props = TextareaProps & ElementProps<"textarea", keyof TextareaProps>;

export const Textarea = (props: Props) => <MantineTextarea {...props} />;
```

- [ ] **Step 2: Create `src/ui/Textarea/index.ts`**

```ts
export { Textarea } from "./Textarea";
```

- [ ] **Step 3: Add export to `src/ui/index.ts`**

Current file:

```ts
export { Button } from "./Button";
export { TextInput } from "./TextInput";
export { NumberInput } from "./NumberInput";
export { Select } from "./Select";
export { Checkbox } from "./Checkbox";
export { Table } from "./Table";
export { Paper } from "./Paper";
export { Alert } from "./Alert";
export { Stack } from "./Stack";
export { Group } from "./Group";
export { ScrollArea, ScrollAreaAutosize } from "./ScrollArea";
```

Add after the `TextInput` export line:

```ts
export { Textarea } from "./Textarea";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Textarea/ src/ui/index.ts
git commit -m "feat: add Textarea UI wrapper"
```

---

## Task 3: Add `Accordion` UI wrapper

**Files:**

- Create: `src/ui/Accordion/Accordion.tsx`
- Create: `src/ui/Accordion/index.ts`
- Modify: `src/ui/index.ts`

- [ ] **Step 1: Create `src/ui/Accordion/Accordion.tsx`**

```tsx
import { Accordion as MantineAccordion } from "@mantine/core";

export const Accordion = MantineAccordion;
```

This re-exports the Mantine Accordion, preserving sub-components (`Accordion.Item`, `Accordion.Control`, `Accordion.Panel`) via the static properties.

- [ ] **Step 2: Create `src/ui/Accordion/index.ts`**

```ts
export { Accordion } from "./Accordion";
```

- [ ] **Step 3: Add export to `src/ui/index.ts`**

Add after the `ScrollArea` export line:

```ts
export { Accordion } from "./Accordion";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Accordion/ src/ui/index.ts
git commit -m "feat: add Accordion UI wrapper"
```

---

## Task 4: Restyle the header

The current header has a large centered title (36px). The new design is a compact single-line header: `Cogitator Tactica` (yellow, small, uppercase) `·` `Statistics Calculator — Warhammer 40,000 10th Edition` (dimmed gray, small, uppercase).

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`

- [ ] **Step 1: Replace header JSX in `src/app/page.tsx`**

Find and replace:

```tsx
{
  /* Header */
}
<header className={styles.header}>
  <h1 className={styles.title}>Cogitator Tactica</h1>
  <p className={styles.subtitle}>
    Statistics calculator for Warhammer 40,000 10th Edition
  </p>
</header>;
```

Replace with:

```tsx
{
  /* Header */
}
<header className={styles.header}>
  <span className={styles.appName}>Cogitator Tactica</span>
  {" · "}
  <span className={styles.appDesc}>
    Statistics Calculator — Warhammer 40,000 10th Edition
  </span>
</header>;
```

- [ ] **Step 2: Replace header CSS in `src/app/page.module.css`**

Replace the entire file with:

```css
.main {
  max-width: 896px;
  margin: 0 auto;
  padding: 40px 16px;
}

.header {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.appName {
  font-weight: 700;
  color: var(--mantine-color-yellow-4);
}

.appDesc {
  color: var(--mantine-color-dimmed);
}

.error {
  margin-top: 12px;
  color: var(--mantine-color-red-4);
  font-size: 14px;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css
git commit -m "feat: restyle header to compact single-line format"
```

---

## Task 5: Redesign `PromptInput`

Replace the current single-line input + Parse button with a centered layout: atmospheric tagline, multiline `Textarea`, and two full-width split buttons (`PARSE REPORT` / `INITIATE SIMULATION`). Add `onSimulate` prop. Remove the `Paper` wrapper (handled in `page.tsx` Task 6).

**Files:**

- Modify: `src/features/calculator/components/PromptInput/PromptInput.tsx`
- Modify: `src/features/calculator/components/PromptInput/PromptInput.module.css`

- [ ] **Step 1: Replace `PromptInput.tsx`**

```tsx
"use client";

import { useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";
import { Textarea, Button, Stack } from "@/ui";
import styles from "./PromptInput.module.css";

type Props = {
  onParsed: (state: CombatFormState) => void;
  onSimulate: (state: CombatFormState) => void;
};

const PromptInput = ({ onParsed, onSimulate }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parse = async (): Promise<CombatFormState | null> => {
    if (!prompt.trim()) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      return data as CombatFormState;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleParse = async () => {
    const state = await parse();
    if (state) onParsed(state);
  };

  const handleSimulate = async () => {
    const state = await parse();
    if (state) onSimulate(state);
  };

  return (
    <Stack gap="md" align="center">
      <p className={styles.tagline}>
        Describe the engagement parameters. Probability matrices will be
        computed and rendered for your strategic calculus.
      </p>
      <div className={styles.inputWrap}>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 10 intercessors with bolt rifles shoot at 20 ork boyz in cover"
          error={error}
          minRows={3}
          autosize
        />
        <div className={styles.buttons}>
          <Button
            variant="default"
            onClick={handleParse}
            disabled={!prompt.trim() || loading}
            loading={loading}
            fullWidth
          >
            PARSE REPORT
          </Button>
          <Button
            color="yellow"
            onClick={handleSimulate}
            disabled={!prompt.trim() || loading}
            loading={loading}
            fullWidth
          >
            INITIATE SIMULATION
          </Button>
        </div>
      </div>
    </Stack>
  );
};

export default PromptInput;
```

- [ ] **Step 2: Replace `PromptInput.module.css`**

```css
.tagline {
  font-size: 15px;
  letter-spacing: 0.04em;
  text-align: center;
  color: var(--mantine-color-dimmed);
  font-style: italic;
  max-width: 480px;
  line-height: 1.6;
  margin: 0;
}

.inputWrap {
  width: 80%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.buttons {
  display: flex;
  gap: 10px;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (note: `page.tsx` will have a type error until Task 6 adds `onSimulate`).

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/PromptInput/
git commit -m "feat: redesign PromptInput with tagline, Textarea, and INITIATE SIMULATION button"
```

---

## Task 6: Refactor `page.tsx` — orchestration

Extract `runCalculation` from `handleCalculate` so it can be called with an explicit form state (needed for simulate-from-prompt). Add refs for accordion and results scroll targets. Add `accordionValue` controlled state. Wrap `CombatForm` in `Accordion`. Remove `Paper` around `PromptInput`. Pass `onSimulate` to `PromptInput`.

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx` entirely**

```tsx
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

  // Pre-fetch the default units on mount so the form has weapon pools immediately
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

  const handleCalculate = async () => {
    await runCalculation(form);
    resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFormChange = useCallback(
    async (next: CombatFormState) => {
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
    async (nextForm: CombatFormState) => {
      await handleFormChange(nextForm);
      setAccordionValue(ACCORDION_VALUE);
      accordionRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    [handleFormChange],
  );

  const handleSimulateFromPrompt = useCallback(
    async (nextForm: CombatFormState) => {
      await handleFormChange(nextForm);
      await runCalculation(nextForm);
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    [handleFormChange],
  );

  return (
    <main className={styles.main}>
      <Stack gap="xl">
        {/* Header */}
        <header className={styles.header}>
          <span className={styles.appName}>Cogitator Tactica</span>
          {" · "}
          <span className={styles.appDesc}>
            Statistics Calculator — Warhammer 40,000 10th Edition
          </span>
        </header>

        {/* Prompt input */}
        <PromptInput
          onParsed={handleParsedFromPrompt}
          onSimulate={handleSimulateFromPrompt}
        />

        {/* Form */}
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

        {/* Results */}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Open http://localhost:3000. Verify:

- Header is compact and single-line
- Prompt area shows tagline + textarea + two buttons (no Paper background)
- "Combat Parameters" accordion is collapsed by default
- Typing a prompt and clicking PARSE REPORT should expand the accordion and scroll to it
- Clicking INITIATE SIMULATION should run the calculation and scroll to results
- The Engage Cogitator button in the form (added in Task 7) should also scroll to results

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add accordion, refs, and simulate-from-prompt orchestration"
```

---

## Task 7: Update `CombatForm` — phase selector and calculate button

**Phase selector changes:** Remove "PHASE" label. Add `IconCrosshair` / `IconSword` icons. Make buttons wider and centered. **Calculate button:** rename to "Engage Cogitator", switch to yellow.

**Files:**

- Modify: `src/features/calculator/components/CombatForm/CombatForm.tsx`
- Modify: `src/features/calculator/components/CombatForm/CombatForm.module.css`

- [ ] **Step 1: Update imports in `CombatForm.tsx`**

Replace the existing import block at the top of the file:

```tsx
"use client";

import {
  CombatFormState,
  Phase,
  FirstFighter,
  UnitProfile,
} from "@/lib/calculator/types";
import {
  Button,
  Select,
  NumberInput,
  Checkbox,
  Paper,
  Stack,
  Group,
} from "@/ui";
import { IconCrosshair, IconSword } from "@tabler/icons-react";
import { WeaponSelector } from "./components/WeaponSelector/WeaponSelector";
import {
  AttackerContextSection,
  relevantContextFlags,
} from "./components/AttackerContextSection/AttackerContextSection";
import styles from "./CombatForm.module.css";
```

- [ ] **Step 2: Replace the phase selector JSX block in `CombatForm.tsx`**

Find:

```tsx
{
  /* Phase selector */
}
<div>
  <label className={styles.sectionLabel}>Phase</label>
  <Group gap="xs">
    {(["shooting", "melee"] as Phase[]).map((p) => (
      <Button
        key={p}
        variant={state.phase === p ? "filled" : "default"}
        onClick={() => handlePhaseChange(p)}
        className={styles.capitalizeButton}
      >
        {p}
      </Button>
    ))}
  </Group>
</div>;
```

Replace with:

```tsx
{
  /* Phase selector */
}
<Group gap="xs" justify="center" grow>
  <Button
    variant={state.phase === "shooting" ? "filled" : "default"}
    color={state.phase === "shooting" ? "yellow" : undefined}
    onClick={() => handlePhaseChange("shooting")}
    leftSection={<IconCrosshair size={16} />}
  >
    Shooting
  </Button>
  <Button
    variant={state.phase === "melee" ? "filled" : "default"}
    color={state.phase === "melee" ? "yellow" : undefined}
    onClick={() => handlePhaseChange("melee")}
    leftSection={<IconSword size={16} />}
  >
    Melee
  </Button>
</Group>;
```

- [ ] **Step 3: Replace the Calculate button JSX in `CombatForm.tsx`**

Find:

```tsx
<Button
  fullWidth
  size="lg"
  color="green"
  onClick={onCalculate}
  className={styles.calculateButton}
>
  Calculate
</Button>
```

Replace with:

```tsx
<Button fullWidth size="lg" color="yellow" onClick={onCalculate}>
  Engage Cogitator
</Button>
```

- [ ] **Step 4: Clean up unused CSS in `CombatForm.module.css`**

Remove the `.sectionLabel`, `.capitalizeButton`, and `.calculateButton` rules (they are no longer used by the phase selector or calculate button). Replace the entire file with:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.attackerHeading {
  font-weight: 700;
  color: var(--mantine-color-yellow-4);
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.05em;
  margin: 0;
}

.defenderHeading {
  font-weight: 700;
  color: var(--mantine-color-blue-4);
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.05em;
  margin: 0;
}

.inCoverHint {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}
```

Note: `.sectionLabel` is still used for the "Who Fights First?" label in melee mode. Keep it if it's referenced — check the JSX. If the JSX still has `className={styles.sectionLabel}` for the "Who Fights First?" label, retain that rule:

```css
.sectionLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  color: var(--mantine-color-gray-3);
}
```

(Keep `.sectionLabel` since it's used for the "Who Fights First?" section label in melee mode.)

Final `CombatForm.module.css`:

```css
.sectionLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  color: var(--mantine-color-gray-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.attackerHeading {
  font-weight: 700;
  color: var(--mantine-color-yellow-4);
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.05em;
  margin: 0;
}

.defenderHeading {
  font-weight: 700;
  color: var(--mantine-color-blue-4);
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.05em;
  margin: 0;
}

.inCoverHint {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/calculator/components/CombatForm/
git commit -m "feat: update phase selector with icons and rename Calculate to Engage Cogitator"
```

---

## Task 8: Update `WeaponSelector` panel backgrounds

Give the "Selected weapons" and "Available weapons" panels a `dark-9` background (one shade darker than the attacker/defender `Paper` which uses `dark-8`). Update the fade gradient color to match.

**Files:**

- Modify: `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx`

- [ ] **Step 1: Update panel backgrounds in `WeaponSelector.tsx`**

Find the first `<Paper withBorder p="xs">` (Selected weapons panel):

```tsx
      <Paper withBorder p="xs">
        <Stack gap="xs">
          <span className={styles.dimmed}>Selected weapons</span>
```

Replace with:

```tsx
      <Paper withBorder p="xs" style={{ background: "var(--mantine-color-dark-9)" }}>
        <Stack gap="xs">
          <span className={styles.dimmed}>Selected weapons</span>
```

Find the second `<Paper withBorder p="xs">` (Available weapons panel):

```tsx
      <Paper withBorder p="xs">
        <Stack gap="xs">
          <span className={styles.dimmed}>Available weapons</span>
```

Replace with:

```tsx
      <Paper withBorder p="xs" style={{ background: "var(--mantine-color-dark-9)" }}>
        <Stack gap="xs">
          <span className={styles.dimmed}>Available weapons</span>
```

- [ ] **Step 2: Update the fade gradient color**

Find:

```tsx
gradientColor = "var(--mantine-color-dark-8)";
```

Replace with:

```tsx
gradientColor = "var(--mantine-color-dark-9)";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify visually**

Start the dev server (`npm run dev`) and open http://localhost:3000. Expand "Combat Parameters". Verify:

- "Selected weapons" and "Available weapons" panels are visibly darker than the attacker/defender Paper cards
- Phase selector shows Crosshair icon for Shooting, Sword icon for Melee
- Active phase button is yellow
- Calculate button now says "Engage Cogitator" and is yellow
- The scroll gradient at the bottom of the available weapons list matches the panel background

- [ ] **Step 5: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx
git commit -m "feat: darken weapon selector panel backgrounds"
```
