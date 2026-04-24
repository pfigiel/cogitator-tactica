# Calculator Routing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single-page calculator into `/calculator` (prompt landing) and `/calculator/results` (form + results + fixed compact prompt), connected via a React Context handoff.

**Architecture:** A `CalculatorContext` lives in a shared `/calculator/layout.tsx` and carries a one-time handoff (`form`, `prompt`, `autoSubmit`) from the landing page to the results page. The results page manages all local computation state; context is only written to again when the bottom prompt input submits.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mantine 9, CSS Modules

---

## File Map

| Status  | Path                                                                      | Change                                                     |
| ------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Modify  | `src/app/layout.module.css`                                               | Add full-height flex to body                               |
| Replace | `src/app/page.tsx`                                                        | `permanentRedirect('/calculator')`                         |
| Delete  | `src/app/page.module.css`                                                 | No longer needed                                           |
| Create  | `src/app/calculator/layout.tsx`                                           | Wraps children in `CalculatorProvider`                     |
| Create  | `src/app/calculator/page.tsx`                                             | Landing page                                               |
| Create  | `src/app/calculator/page.module.css`                                      | Landing styles                                             |
| Create  | `src/app/calculator/results/page.tsx`                                     | Results page                                               |
| Create  | `src/app/calculator/results/page.module.css`                              | Results styles                                             |
| Create  | `src/features/calculator/context/CalculatorContext/CalculatorContext.tsx` | Context + provider + hook                                  |
| Create  | `src/features/calculator/context/CalculatorContext/index.ts`              | Barrel file                                                |
| Modify  | `src/features/calculator/components/PromptInput/PromptInput.tsx`          | Add `compact`, `initialPrompt`, update callback signatures |
| Modify  | `src/features/calculator/components/CombatForm/CombatForm.tsx`            | Move units/unitList into internal state                    |

---

## Task 1: Create CalculatorContext

**Files:**

- Create: `src/features/calculator/context/CalculatorContext/CalculatorContext.tsx`
- Create: `src/features/calculator/context/CalculatorContext/index.ts`

- [ ] **Step 1: Create the context file**

```tsx
// src/features/calculator/context/CalculatorContext/CalculatorContext.tsx
"use client";

import { createContext, useContext, useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";

export type CalculatorHandoff = {
  form: CombatFormState;
  prompt: string;
  autoSubmit: boolean;
};

type CalculatorContextValue = {
  handoff: CalculatorHandoff | null;
  setHandoff: (h: CalculatorHandoff) => void;
};

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

export const CalculatorProvider = ({ children }: Props) => {
  const [handoff, setHandoff] = useState<CalculatorHandoff | null>(null);

  return (
    <CalculatorContext.Provider value={{ handoff, setHandoff }}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = (): CalculatorContextValue => {
  const ctx = useContext(CalculatorContext);
  if (!ctx)
    throw new Error("useCalculator must be used within CalculatorProvider");
  return ctx;
};
```

- [ ] **Step 2: Create the barrel file**

```ts
// src/features/calculator/context/CalculatorContext/index.ts
export { CalculatorProvider, useCalculator } from "./CalculatorContext";
export type { CalculatorHandoff } from "./CalculatorContext";
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/context/
git commit -m "feat: add CalculatorContext with handoff state"
```

---

## Task 2: Root redirect and /calculator layout

**Files:**

- Replace: `src/app/page.tsx`
- Delete: `src/app/page.module.css`
- Create: `src/app/calculator/layout.tsx`

- [ ] **Step 1: Replace root page with redirect**

```tsx
// src/app/page.tsx  (replace entire file)
import { permanentRedirect } from "next/navigation";

const RootPage = () => permanentRedirect("/calculator");

export default RootPage;
```

- [ ] **Step 2: Delete the now-unused page CSS module**

```bash
rm src/app/page.module.css
```

- [ ] **Step 3: Create the calculator segment layout**

```tsx
// src/app/calculator/layout.tsx
import { CalculatorProvider } from "@/features/calculator/context/CalculatorContext";

type Props = {
  children: React.ReactNode;
};

const CalculatorLayout = ({ children }: Props) => (
  <CalculatorProvider>{children}</CalculatorProvider>
);

export default CalculatorLayout;
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/calculator/layout.tsx
git rm src/app/page.module.css
git commit -m "feat: redirect root to /calculator and add CalculatorProvider layout"
```

---

## Task 3: Update PromptInput

**Files:**

- Modify: `src/features/calculator/components/PromptInput/PromptInput.tsx`

Changes: add `compact` and `initialPrompt` props; update `onParsed`/`onSimulate` signatures to include the raw prompt string.

- [ ] **Step 1: Replace PromptInput.tsx**

```tsx
// src/features/calculator/components/PromptInput/PromptInput.tsx
"use client";

import { useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";
import { Textarea, Button, Stack } from "@/ui";
import styles from "./PromptInput.module.css";

type Props = {
  className?: string;
  compact?: boolean;
  initialPrompt?: string;
  onParsed: (state: CombatFormState, prompt: string) => void;
  onSimulate: (state: CombatFormState, prompt: string) => void;
};

const PromptInput = ({
  className,
  compact,
  initialPrompt,
  onParsed,
  onSimulate,
}: Props) => {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [loadingAction, setLoadingAction] = useState<
    "parse" | "simulate" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const parse = async (
    action: "parse" | "simulate",
  ): Promise<CombatFormState | null> => {
    if (!prompt.trim()) return null;
    setLoadingAction(action);
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
      setLoadingAction(null);
    }
  };

  const handleParse = async () => {
    const state = await parse("parse");
    if (state) onParsed(state, prompt);
  };

  const handleSimulate = async () => {
    const state = await parse("simulate");
    if (state) onSimulate(state, prompt);
  };

  return (
    <Stack className={className} gap={compact ? "xs" : "md"} align="center">
      {!compact && (
        <p className={styles.tagline}>
          Describe the engagement parameters. Probability matrices will be
          computed and rendered for your strategic calculus.
        </p>
      )}
      <div className={styles.inputWrap}>
        <Textarea
          className={styles.textArea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 10 intercessors with bolt rifles shoot at 20 ork boyz in cover"
          error={error}
          minRows={compact ? 1 : 3}
          autosize
        />
        <div className={styles.buttons}>
          <Button
            variant="default"
            onClick={handleParse}
            disabled={!prompt.trim() || loadingAction !== null}
            loading={loadingAction === "parse"}
            fullWidth
          >
            {compact ? "Parse" : "Parse report"}
          </Button>
          <Button
            color="yellow"
            onClick={handleSimulate}
            disabled={!prompt.trim() || loadingAction !== null}
            loading={loadingAction === "simulate"}
            fullWidth
          >
            {compact ? "Engage" : "Engage cogitator"}
          </Button>
        </div>
      </div>
    </Stack>
  );
};

export default PromptInput;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors (root page.tsx no longer uses PromptInput, so no stale callers).

- [ ] **Step 3: Commit**

```bash
git add src/features/calculator/components/PromptInput/PromptInput.tsx
git commit -m "feat: add compact/initialPrompt props to PromptInput and include prompt in callbacks"
```

---

## Task 4: Landing page and full-height body layout

**Files:**

- Modify: `src/app/layout.module.css`
- Create: `src/app/calculator/page.tsx`
- Create: `src/app/calculator/page.module.css`

- [ ] **Step 1: Make the body a full-height flex column**

In `src/app/layout.module.css`, update the `.body` rule:

```css
.body {
  background-color: var(--mantine-color-dark-9);
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
```

Leave `.header`, `.appName`, `.appDesc` unchanged.

- [ ] **Step 2: Create the landing page styles**

```css
/* src/app/calculator/page.module.css */
.page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--content-padding-x);
}

.promptWrap {
  width: 100%;
  max-width: var(--content-max-width);
}
```

- [ ] **Step 3: Create the landing page**

```tsx
// src/app/calculator/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { CombatFormState } from "@/lib/calculator/types";
import { useCalculator } from "@/features/calculator/context/CalculatorContext";
import PromptInput from "@/features/calculator/components/PromptInput/PromptInput";
import styles from "./page.module.css";

const CalculatorPage = () => {
  const router = useRouter();
  const { setHandoff } = useCalculator();

  const handleParsed = (form: CombatFormState, prompt: string) => {
    setHandoff({ form, prompt, autoSubmit: false });
    router.push("/calculator/results");
  };

  const handleSimulate = (form: CombatFormState, prompt: string) => {
    setHandoff({ form, prompt, autoSubmit: true });
    router.push("/calculator/results");
  };

  return (
    <main className={styles.page}>
      <div className={styles.promptWrap}>
        <PromptInput onParsed={handleParsed} onSimulate={handleSimulate} />
      </div>
    </main>
  );
};

export default CalculatorPage;
```

- [ ] **Step 4: Start dev server and verify landing page**

```bash
npm run dev
```

Open http://localhost:3000 — should redirect to `/calculator`. The page should show the prompt input centred both vertically and horizontally. The app name in the header only (no banner). Tagline visible below the header.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.module.css src/app/calculator/page.tsx src/app/calculator/page.module.css
git commit -m "feat: add /calculator landing page with centred prompt input"
```

---

## Task 5: Results page

**Files:**

- Create: `src/app/calculator/results/page.tsx`
- Create: `src/app/calculator/results/page.module.css`

Note: CombatForm still receives `units` and `unitList` as props at this stage. Task 6 moves those inside CombatForm.

- [ ] **Step 1: Create results page styles**

```css
/* src/app/calculator/results/page.module.css */
.page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 24px var(--content-padding-x);
  max-width: var(--content-max-width);
  margin: 0 auto;
  width: 100%;
}

.error {
  margin-top: 12px;
  color: var(--mantine-color-red-4);
  font-size: 14px;
}

.emptyState {
  border: 1px dashed var(--mantine-color-dark-4);
  border-radius: var(--mantine-radius-md);
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.emptyIcon {
  font-size: 28px;
  color: var(--mantine-color-dark-4);
  line-height: 1;
}

.emptyHeading {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--mantine-color-dimmed);
  margin: 0;
}

.emptyHint {
  font-size: 12px;
  color: var(--mantine-color-dark-3);
  font-style: italic;
  max-width: 260px;
  line-height: 1.6;
  margin: 0;
}

.bottomBar {
  flex-shrink: 0;
  border-top: 1px solid var(--mantine-color-dark-5);
  background-color: var(--mantine-color-dark-9);
  padding: 12px var(--content-padding-x);
}

.bottomBarInner {
  max-width: var(--content-max-width);
  margin: 0 auto;
}
```

- [ ] **Step 2: Create the results page**

```tsx
// src/app/calculator/results/page.tsx
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
  const [unitList, setUnitList] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const unitsRef = useRef<Record<string, UnitProfile>>({});
  const [units, setUnits] = useState<Record<string, UnitProfile>>({});

  const setUnitsAndRef = (
    updater: (prev: Record<string, UnitProfile>) => Record<string, UnitProfile>,
  ) => {
    setUnits((prev) => {
      const next = updater(prev);
      unitsRef.current = next;
      return next;
    });
  };

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
    fetch("/api/units")
      .then((r) => r.json())
      .then((list: Array<{ id: string; name: string }>) => setUnitList(list))
      .catch(() => {});
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormChange = useCallback(
    (next: CombatFormState) => {
      if (form && next.attackerUnitId !== form.attackerUnitId)
        ensureUnit(next.attackerUnitId);
      if (form && next.defenderUnitId !== form.defenderUnitId)
        ensureUnit(next.defenderUnitId);
      setForm(next);
    },
    [form, ensureUnit],
  );

  const handleCalculate = async () => {
    if (form) await runCalculation(form);
  };

  const handleParsed = (nextForm: CombatFormState, nextPrompt: string) => {
    setForm(nextForm);
    setPrompt(nextPrompt);
    setResult(null);
    setAccordionValue(ACCORDION_VALUE);
    setHandoff({ form: nextForm, prompt: nextPrompt, autoSubmit: false });
    ensureUnit(nextForm.attackerUnitId);
    ensureUnit(nextForm.defenderUnitId);
  };

  const handleSimulate = async (
    nextForm: CombatFormState,
    nextPrompt: string,
  ) => {
    setForm(nextForm);
    setPrompt(nextPrompt);
    setResult(null);
    setHandoff({ form: nextForm, prompt: nextPrompt, autoSubmit: true });
    await runCalculation(nextForm);
  };

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
                  units={units}
                  unitList={unitList}
                />
                {error && <p className={styles.error}>Error: {error}</p>}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

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
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify in browser**

With `npm run dev` running:

- Navigate to http://localhost:3000 — redirects to `/calculator` ✓
- Type a prompt (e.g. "10 intercessors shoot 20 ork boyz"), click **Parse report** → redirects to `/calculator/results`, accordion open, empty state visible ✓
- Navigate back, type a prompt, click **Engage cogitator** → redirects to `/calculator/results`, accordion collapsed, results shown ✓
- Navigate directly to http://localhost:3000/calculator/results (hard refresh) → redirects back to `/calculator` ✓
- On results page, use the bottom prompt bar to re-engage → results update in place, no redirect ✓
- Bottom buttons say "Parse" and "Engage" (not the full labels) ✓
- Bottom bar has a hard border-top, no gradient ✓
- Content area scrolls independently when accordion is open and results are both visible ✓

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/results/
git commit -m "feat: add /calculator/results page with accordion, results, and compact bottom prompt"
```

---

## Task 6: Move units/unitList into CombatForm

**Files:**

- Modify: `src/features/calculator/components/CombatForm/CombatForm.tsx`
- Modify: `src/app/calculator/results/page.tsx`

Remove `units` and `unitList` from CombatForm's props. CombatForm fetches and caches them internally. The results page drops the `units`/`unitList` state it was passing down (it retains its own `unitsRef`/`ensureUnit` for `runCalculation`).

- [ ] **Step 1: Update CombatForm to own its units state**

Replace the Props type and add internal state at the top of the component. The full updated `CombatForm.tsx`:

```tsx
// src/features/calculator/components/CombatForm/CombatForm.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import WeaponSelector from "./components/WeaponSelector/WeaponSelector";
import {
  AttackerContextSection,
  relevantContextFlags,
} from "./components/AttackerContextSection/AttackerContextSection";
import styles from "./CombatForm.module.css";

type Props = {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
};

const CombatForm = ({ state, onChange, onCalculate }: Props) => {
  const [unitList, setUnitList] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const unitsRef = useRef<Record<string, UnitProfile>>({});
  const [units, setUnits] = useState<Record<string, UnitProfile>>({});

  const setUnitsAndRef = (
    updater: (prev: Record<string, UnitProfile>) => Record<string, UnitProfile>,
  ) => {
    setUnits((prev) => {
      const next = updater(prev);
      unitsRef.current = next;
      return next;
    });
  };

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
    fetch("/api/units")
      .then((r) => r.json())
      .then((list: Array<{ id: string; name: string }>) => setUnitList(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    ensureUnit(state.attackerUnitId);
    ensureUnit(state.defenderUnitId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const UNIT_DATA = unitList.map((u) => ({ value: u.id, label: u.name }));

  const handlePhaseChange = (phase: Phase) => {
    const attackerUnit = unitsRef.current[state.attackerUnitId];
    const defenderUnit = unitsRef.current[state.defenderUnitId];
    const attackerPool = attackerUnit
      ? phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons
      : [];
    const defenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];
    onChange({
      ...state,
      phase,
      attackerWeapons:
        attackerPool.length > 0 ? [{ weaponId: attackerPool[0].id }] : [],
      defenderWeapons:
        defenderPool.length > 0 ? [{ weaponId: defenderPool[0].id }] : [],
    });
  };

  const handleAttackerUnitChange = (unitId: string) => {
    ensureUnit(unitId);
    const unit = unitsRef.current[unitId];
    const pool = unit
      ? state.phase === "shooting"
        ? unit.shootingWeapons
        : unit.meleeWeapons
      : [];
    onChange({
      ...state,
      attackerUnitId: unitId,
      attackerWeapons: pool.length > 0 ? [{ weaponId: pool[0].id }] : [],
    });
  };

  const handleDefenderUnitChange = (unitId: string) => {
    ensureUnit(unitId);
    const unit = unitsRef.current[unitId];
    const meleeWeapons = unit ? unit.meleeWeapons : [];
    onChange({
      ...state,
      defenderUnitId: unitId,
      defenderWeapons:
        meleeWeapons.length > 0 ? [{ weaponId: meleeWeapons[0].id }] : [],
    });
  };

  const toggleAttackerWeapon = (weaponId: string) => {
    const isSelected = state.attackerWeapons.some(
      (w) => w.weaponId === weaponId,
    );
    if (isSelected) {
      onChange({
        ...state,
        attackerWeapons: state.attackerWeapons.filter(
          (w) => w.weaponId !== weaponId,
        ),
      });
    } else {
      onChange({
        ...state,
        attackerWeapons: [...state.attackerWeapons, { weaponId }],
      });
    }
  };

  const setAttackerWeaponCount = (weaponId: string, count: number) => {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.map((w) =>
        w.weaponId === weaponId ? { ...w, modelCount: count } : w,
      ),
    });
  };

  const moveAttackerWeaponUp = (weaponId: string) => {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  };

  const moveAttackerWeaponDown = (weaponId: string) => {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  };

  const toggleDefenderWeapon = (weaponId: string) => {
    const isSelected = state.defenderWeapons.some(
      (w) => w.weaponId === weaponId,
    );
    if (isSelected) {
      onChange({
        ...state,
        defenderWeapons: state.defenderWeapons.filter(
          (w) => w.weaponId !== weaponId,
        ),
      });
    } else {
      onChange({
        ...state,
        defenderWeapons: [...state.defenderWeapons, { weaponId }],
      });
    }
  };

  const setDefenderWeaponCount = (weaponId: string, count: number) => {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.map((w) =>
        w.weaponId === weaponId ? { ...w, modelCount: count } : w,
      ),
    });
  };

  const moveDefenderWeaponUp = (weaponId: string) => {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  };

  const moveDefenderWeaponDown = (weaponId: string) => {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  };

  const attackerUnit = units[state.attackerUnitId];
  const defenderUnit = units[state.defenderUnitId];
  const attackerWeaponPool = attackerUnit
    ? state.phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons
    : [];

  const attackerContextFlags = relevantContextFlags(
    attackerWeaponPool,
    state.attackerWeapons,
  );
  const defenderContextFlags = relevantContextFlags(
    defenderUnit?.meleeWeapons ?? [],
    state.defenderWeapons,
  );

  return (
    <Stack gap="md">
      {/* Phase selector */}
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
      </Group>

      <div className={styles.grid}>
        {/* Attacker */}
        <Paper>
          <Stack gap="sm">
            <h3 className={styles.attackerHeading}>Attacker</h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.attackerUnitId}
              onChange={(value) => value && handleAttackerUnitChange(value)}
              data={UNIT_DATA}
            />
            <NumberInput
              label="Model Count"
              min={1}
              max={100}
              value={state.attackerCount}
              onChange={(val) =>
                onChange({
                  ...state,
                  attackerCount: typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
            <WeaponSelector
              weapons={attackerWeaponPool}
              selected={state.attackerWeapons}
              defaultModelCount={state.attackerCount}
              weaponType={state.phase}
              onToggle={toggleAttackerWeapon}
              onCountChange={setAttackerWeaponCount}
              onMoveUp={moveAttackerWeaponUp}
              onMoveDown={moveAttackerWeaponDown}
            />
            <AttackerContextSection
              idPrefix="attacker"
              context={state.attackerContext}
              flags={attackerContextFlags}
              onChange={(ctx) => onChange({ ...state, attackerContext: ctx })}
            />
          </Stack>
        </Paper>

        {/* Defender */}
        <Paper>
          <Stack gap="sm">
            <h3 className={styles.defenderHeading}>Defender</h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.defenderUnitId}
              onChange={(value) => value && handleDefenderUnitChange(value)}
              data={UNIT_DATA}
            />
            <NumberInput
              label="Model Count"
              min={1}
              max={100}
              value={state.defenderCount}
              onChange={(val) =>
                onChange({
                  ...state,
                  defenderCount: typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
            <Checkbox
              color="yellow"
              checked={state.defenderInCover}
              onChange={(e) =>
                onChange({
                  ...state,
                  defenderInCover: e.currentTarget.checked,
                })
              }
              label={
                <>
                  In Cover{" "}
                  <span className={styles.inCoverHint}>(+1 to save)</span>
                </>
              }
            />
            {state.phase === "melee" && (
              <>
                <WeaponSelector
                  weapons={defenderUnit?.meleeWeapons ?? []}
                  selected={state.defenderWeapons}
                  defaultModelCount={state.defenderCount}
                  weaponType="melee"
                  onToggle={toggleDefenderWeapon}
                  onCountChange={setDefenderWeaponCount}
                  onMoveUp={moveDefenderWeaponUp}
                  onMoveDown={moveDefenderWeaponDown}
                />
                <AttackerContextSection
                  idPrefix="defender"
                  context={state.defenderContext}
                  flags={defenderContextFlags}
                  onChange={(ctx) =>
                    onChange({ ...state, defenderContext: ctx })
                  }
                />
              </>
            )}
          </Stack>
        </Paper>
      </div>

      {/* First fighter (melee only) */}
      {state.phase === "melee" && (
        <div>
          <label className={styles.sectionLabel}>Who Fights First?</label>
          <Group gap="xs">
            {(["attacker", "defender"] as FirstFighter[]).map((f) => (
              <Button
                key={f}
                variant={state.firstFighter === f ? "filled" : "default"}
                onClick={() => onChange({ ...state, firstFighter: f })}
              >
                {f}
              </Button>
            ))}
          </Group>
        </div>
      )}

      <Button fullWidth size="lg" color="yellow" onClick={onCalculate}>
        Engage Cogitator
      </Button>
    </Stack>
  );
};

export default CombatForm;
```

- [ ] **Step 2: Remove units/unitList from results page**

In `src/app/calculator/results/page.tsx`, make the following changes:

**Remove entirely:**

- `unitList` state (`useState<Array<...>>([])`) and its setter `setUnitList`
- `units` state (`useState<Record<string, UnitProfile>>({})`) and its setter `setUnits`
- `setUnitsAndRef` helper function (it called `setUnits` which no longer exists)
- The `useEffect` that fetches `/api/units` for the unit list
- The `units={units}` and `unitList={unitList}` props from the `<CombatForm>` call
- The `ensureUnit` calls inside `handleFormChange` (CombatForm now owns unit loading)

**Update `ensureUnit`** — since the results page no longer has a `units` React state (only the ref is needed for calculation), simplify `ensureUnit` to write directly to the ref:

```tsx
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
```

**Update `handleFormChange`:**

```tsx
const handleFormChange = useCallback((next: CombatFormState) => {
  setForm(next);
}, []);
```

**Update `<CombatForm>` — remove the two props:**

```tsx
<CombatForm
  state={form}
  onChange={handleFormChange}
  onCalculate={handleCalculate}
/>
```

Keep: `unitsRef` and `ensureUnit` — still used by `runCalculation` and the mount effect.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify in browser**

- Parse flow: accordion opens, form fields populated from parsed prompt, unit selectors show correct units ✓
- Engage flow: results display, weapon pools correct ✓
- Changing unit in form dropdown still works (CombatForm loads the new unit internally) ✓
- Phase toggle updates weapon pools ✓

- [ ] **Step 5: Commit**

```bash
git add src/features/calculator/components/CombatForm/CombatForm.tsx \
        src/app/calculator/results/page.tsx
git commit -m "refactor: move units/unitList cache into CombatForm"
```
