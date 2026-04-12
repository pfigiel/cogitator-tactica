# CSS Modules Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all inline `style` props with co-located CSS module files so no inline styles remain in the codebase.

**Architecture:** Each component gets a `ComponentName.module.css` file placed next to it. CSS modules are imported as `import styles from './ComponentName.module.css'` and applied via `className`. Mantine CSS variables are used freely inside module files. `clsx` is installed as a dependency to support conditional class composition.

**Tech Stack:** Next.js (CSS modules built-in), Mantine v9 (CSS vars for color tokens), clsx (conditional class composition)

---

## Setup

### Task 0: Install clsx

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install clsx**

```bash
npm install clsx
```

Expected output: `added 1 package`

- [ ] **Step 2: Verify import works**

```bash
node -e "require('clsx'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add clsx dependency"
```

---

## Task 1: WeaponRecord

**Files:**
- Modify: `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.tsx`
- Create: `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.module.css`:

```css
.toggleButton {
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats {
  font-size: 11px;
}

.statLabel {
  color: var(--mantine-color-dimmed);
}

.statValue {
  font-weight: bold;
}

.abilities {
  font-size: 11px;
  color: var(--mantine-color-dimmed);
}

.countInput {
  flex-shrink: 0;
}

.orderButtons {
  flex-shrink: 0;
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `WeaponRecord.tsx`:

```tsx
import type { WeaponProfile } from "@/lib/calculator/types";
import { Paper, Group, Stack, Button, NumberInput } from "@/ui";
import { formatStats, formatAbilities } from "./weaponFormatters";
import styles from "./WeaponRecord.module.css";

interface SelectionProps {
  modelCount: number;
  onCountChange: (count: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

interface WeaponRecordProps {
  weapon: WeaponProfile;
  weaponType: "shooting" | "melee";
  isSelected: boolean;
  onToggle: () => void;
  selectionProps?: SelectionProps;
}

export const WeaponRecord = ({
  weapon,
  weaponType,
  isSelected,
  onToggle,
  selectionProps,
}: WeaponRecordProps) => {
  const stats = formatStats(weapon, weaponType);
  const abilities = formatAbilities(weapon.abilities);

  return (
    <Paper withBorder p="xs">
      <Group wrap="nowrap" align="center" gap="xs">
        <Button
          size="compact-xs"
          variant="subtle"
          color="yellow"
          onClick={onToggle}
          aria-label={
            isSelected ? `Remove ${weapon.name}` : `Add ${weapon.name}`
          }
          className={styles.toggleButton}
        >
          {isSelected ? "−" : "+"}
        </Button>

        <div className={styles.content}>
          <div className={styles.name}>{weapon.name}</div>
          <div className={styles.stats}>
            {stats.map(({ label, value }) => (
              <span className={styles.statLabel} key={label}>
                <span>{label}</span>
                <span className={styles.statValue}>{value}</span>{" "}
              </span>
            ))}
          </div>
          <div className={styles.abilities}>
            {abilities.length ? abilities : "-"}
          </div>
        </div>

        {selectionProps && (
          <>
            <NumberInput
              size="xs"
              w={70}
              min={1}
              max={100}
              value={selectionProps.modelCount}
              onChange={(val) =>
                selectionProps.onCountChange(
                  typeof val === "number" ? Math.max(1, val) : 1,
                )
              }
              className={styles.countInput}
            />
            <Stack gap="2px" className={styles.orderButtons}>
              <Button
                size="compact-xs"
                variant="subtle"
                color="yellow"
                onClick={selectionProps.onMoveUp}
                disabled={selectionProps.isFirst}
                aria-label={`Move ${weapon.name} up`}
              >
                ▲
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                color="yellow"
                onClick={selectionProps.onMoveDown}
                disabled={selectionProps.isLast}
                aria-label={`Move ${weapon.name} down`}
              >
                ▼
              </Button>
            </Stack>
          </>
        )}
      </Group>
    </Paper>
  );
};
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/
git commit -m "refactor: migrate WeaponRecord to CSS modules, drop color prop"
```

---

## Task 2: WeaponTable

**Files:**
- Modify: `src/features/calculator/components/ResultsDisplay/components/WeaponTable/WeaponTable.tsx`
- Create: `src/features/calculator/components/ResultsDisplay/components/WeaponTable/WeaponTable.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/ResultsDisplay/components/WeaponTable/WeaponTable.module.css`:

```css
.weaponName {
  font-weight: 600;
  font-size: 14px;
  margin: 0;
}

.modelCount {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}

.th {
  font-size: 12px;
}

.thRight {
  font-size: 12px;
  text-align: right;
}

.td {
  font-size: 12px;
}

.tdInput {
  font-size: 12px;
  text-align: right;
  color: var(--mantine-color-dimmed);
}

.tdAverage {
  font-size: 12px;
  text-align: right;
  font-weight: 700;
  color: var(--mantine-color-yellow-4);
}

.summary {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}

.damageValue {
  color: var(--mantine-color-yellow-4);
  font-weight: 700;
}

.modelsSlainValue {
  color: var(--mantine-color-red-4);
  font-weight: 700;
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `WeaponTable.tsx`:

```tsx
import { WeaponResult } from "@/lib/calculator/types";
import { Table, Stack, Group } from "@/ui";
import styles from "./WeaponTable.module.css";

export const WeaponTable = ({ weaponResult }: { weaponResult: WeaponResult }) => {
  return (
    <Stack gap="xs">
      <Group gap="xs" align="baseline">
        <h4 className={styles.weaponName}>{weaponResult.weaponName}</h4>
        <span className={styles.modelCount}>{weaponResult.modelCount} model(s)</span>
      </Group>
      <Table striped highlightOnHover withRowBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th className={styles.th}>Step</Table.Th>
            <Table.Th className={styles.thRight}>Input</Table.Th>
            <Table.Th className={styles.thRight}>Average</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {weaponResult.steps.map((step, i) => (
            <Table.Tr key={i}>
              <Table.Td className={styles.td}>{step.label}</Table.Td>
              <Table.Td className={styles.tdInput}>{step.input.toFixed(2)}</Table.Td>
              <Table.Td className={styles.tdAverage}>{step.average.toFixed(2)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group gap="lg" className={styles.summary}>
        <span>
          Damage:{" "}
          <span className={styles.damageValue}>
            {weaponResult.averageDamage.toFixed(2)}
          </span>
        </span>
        <span>
          Models Slain:{" "}
          <span className={styles.modelsSlainValue}>
            {weaponResult.averageModelsSlain.toFixed(2)}
          </span>
        </span>
      </Group>
    </Stack>
  );
};
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/ResultsDisplay/components/WeaponTable/WeaponTable.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/ResultsDisplay/components/WeaponTable/
git commit -m "refactor: migrate WeaponTable to CSS modules"
```

---

## Task 3: AttackerContextSection

**Files:**
- Modify: `src/features/calculator/components/CombatForm/components/AttackerContextSection/AttackerContextSection.tsx`
- Create: `src/features/calculator/components/CombatForm/components/AttackerContextSection/AttackerContextSection.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/CombatForm/components/AttackerContextSection/AttackerContextSection.module.css`:

```css
.conditionsLabel {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}

.hint {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `AttackerContextSection.tsx`:

```tsx
import { AttackerContext, SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Checkbox, Stack } from "@/ui";
import styles from "./AttackerContextSection.module.css";

export const relevantContextFlags = (
  weapons: WeaponProfile[],
  selected: SelectedWeapon[]
) => {
  const profiles = selected
    .map((s) => weapons.find((w) => w.name === s.weaponName))
    .filter((w): w is WeaponProfile => w !== undefined);

  return {
    showStationary: profiles.some((w) =>
      w.abilities.some((a) => a.type === "HEAVY")
    ),
    showCharged: profiles.some((w) =>
      w.abilities.some((a) => a.type === "LANCE")
    ),
    showHalfRange: profiles.some((w) =>
      w.abilities.some((a) => a.type === "RAPID_FIRE" || a.type === "MELTA")
    ),
    showLongRange: profiles.some((w) =>
      w.abilities.some((a) => a.type === "CONVERSION")
    ),
  };
};

export const AttackerContextSection = ({
  idPrefix,
  context,
  flags,
  onChange,
}: {
  idPrefix: string;
  context: AttackerContext;
  flags: ReturnType<typeof relevantContextFlags>;
  onChange: (ctx: AttackerContext) => void;
}) => {
  const { showStationary, showCharged, showHalfRange, showLongRange } = flags;
  if (!showStationary && !showCharged && !showHalfRange && !showLongRange)
    return null;

  return (
    <Stack gap="xs">
      <label className={styles.conditionsLabel}>Conditions</label>
      <Stack gap="4px">
        {showStationary && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-stationary`}
            checked={context.remainedStationary}
            onChange={(e) =>
              onChange({
                ...context,
                remainedStationary: e.currentTarget.checked,
              })
            }
            label={
              <>
                Remained Stationary{" "}
                <span className={styles.hint}>(Heavy +1 to hit)</span>
              </>
            }
          />
        )}
        {showCharged && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-charged`}
            checked={context.charged}
            onChange={(e) =>
              onChange({ ...context, charged: e.currentTarget.checked })
            }
            label={
              <>
                Charged this turn{" "}
                <span className={styles.hint}>(Lance +1 to wound)</span>
              </>
            }
          />
        )}
        {showHalfRange && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-halfrange`}
            checked={context.atHalfRange}
            onChange={(e) =>
              onChange({ ...context, atHalfRange: e.currentTarget.checked })
            }
            label={
              <>
                At half range{" "}
                <span className={styles.hint}>(Rapid Fire / Melta)</span>
              </>
            }
          />
        )}
        {showLongRange && (
          <Checkbox
            color="yellow"
            id={`${idPrefix}-longrange`}
            checked={context.atLongRange}
            onChange={(e) =>
              onChange({ ...context, atLongRange: e.currentTarget.checked })
            }
            label={
              <>
                At long range{" "}
                <span className={styles.hint}>(Conversion crits on 4+)</span>
              </>
            }
          />
        )}
      </Stack>
    </Stack>
  );
};
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/CombatForm/components/AttackerContextSection/AttackerContextSection.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/AttackerContextSection/
git commit -m "refactor: migrate AttackerContextSection to CSS modules, drop color prop"
```

---

## Task 4: DirectionTable

**Files:**
- Modify: `src/features/calculator/components/ResultsDisplay/components/DirectionTable/DirectionTable.tsx`
- Create: `src/features/calculator/components/ResultsDisplay/components/DirectionTable/DirectionTable.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/ResultsDisplay/components/DirectionTable/DirectionTable.module.css`:

```css
.heading {
  font-weight: 700;
  font-size: 18px;
  color: var(--mantine-color-yellow-4);
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: var(--mantine-color-dimmed);
  margin: 0;
}

.totalsSection {
  padding-top: 8px;
  border-top: 1px solid var(--mantine-color-dark-4);
}

.combinedLabel {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.statLabel {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
  text-transform: uppercase;
}

.damageValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--mantine-color-yellow-4);
}

.modelsSlainValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--mantine-color-red-4);
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `DirectionTable.tsx`:

```tsx
import { DirectionalResult } from "@/lib/calculator/types";
import { Stack, Group } from "@/ui";
import { WeaponTable } from "../WeaponTable/WeaponTable";
import styles from "./DirectionTable.module.css";

export const DirectionTable = ({
  result,
  title,
}: {
  result: DirectionalResult;
  title: string;
}) => {
  const multiWeapon = result.weaponResults.length > 1;

  return (
    <Stack gap="sm">
      <h3 className={styles.heading}>{title}</h3>
      <p className={styles.subtitle}>
        {result.attackerName} → {result.defenderName}
      </p>
      <Stack gap="lg">
        {result.weaponResults.map((wr) => (
          <WeaponTable key={wr.weaponName} weaponResult={wr} />
        ))}
      </Stack>
      <div className={styles.totalsSection}>
        {multiWeapon && (
          <p className={styles.combinedLabel}>Combined totals</p>
        )}
        <Group gap="xl">
          <div>
            <div className={styles.statLabel}>Avg Damage</div>
            <div className={styles.damageValue}>
              {result.totalAverageDamage.toFixed(2)}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>Avg Models Slain</div>
            <div className={styles.modelsSlainValue}>
              {result.totalAverageModelsSlain.toFixed(2)}
            </div>
          </div>
        </Group>
      </div>
    </Stack>
  );
};
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/ResultsDisplay/components/DirectionTable/DirectionTable.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/ResultsDisplay/components/DirectionTable/
git commit -m "refactor: migrate DirectionTable to CSS modules, drop color prop"
```

---

## Task 5: WeaponSelector

**Files:**
- Modify: `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx`
- Create: `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.module.css`:

```css
.dimmed {
  font-size: 12px;
  color: var(--mantine-color-dimmed);
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `WeaponSelector.tsx`:

```tsx
import type { SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Stack } from "@/ui";
import { WeaponRecord } from "./components/WeaponRecord";
import styles from "./WeaponSelector.module.css";

export const WeaponSelector = ({
  weapons,
  selected,
  defaultModelCount,
  weaponType,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  weaponType: "shooting" | "melee";
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}) => {
  if (weapons.length === 0) return null;

  const selectedWeapons = selected
    .map((s) => ({
      profile: weapons.find((w) => w.name === s.weaponName),
      entry: s,
    }))
    .filter((x): x is { profile: WeaponProfile; entry: SelectedWeapon } =>
      x.profile !== undefined
    );

  const availableWeapons = weapons.filter(
    (w) => !selected.some((s) => s.weaponName === w.name)
  );

  return (
    <Stack gap="xs">
      <Stack gap="xs">
        <span className={styles.dimmed}>Selected weapons</span>
        {selectedWeapons.length === 0 ? (
          <span className={styles.dimmed}>No weapons selected</span>
        ) : (
          selectedWeapons.map((sw, idx) => (
            <WeaponRecord
              key={sw.profile.name}
              weapon={sw.profile}
              weaponType={weaponType}
              isSelected={true}
              onToggle={() => onToggle(sw.profile.name)}
              selectionProps={{
                modelCount: sw.entry.modelCount ?? defaultModelCount,
                onCountChange: (val) => onCountChange(sw.profile.name, val),
                onMoveUp: () => onMoveUp(sw.profile.name),
                onMoveDown: () => onMoveDown(sw.profile.name),
                isFirst: idx === 0,
                isLast: idx === selectedWeapons.length - 1,
              }}
            />
          ))
        )}
      </Stack>
      <Stack gap="xs">
        <span className={styles.dimmed}>Available weapons</span>
        {availableWeapons.length === 0 ? (
          <span className={styles.dimmed}>No weapons available</span>
        ) : (
          availableWeapons.map((w) => (
            <WeaponRecord
              key={w.name}
              weapon={w}
              weaponType={weaponType}
              isSelected={false}
              onToggle={() => onToggle(w.name)}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
};
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/
git commit -m "refactor: migrate WeaponSelector to CSS modules, drop color prop"
```

---

## Task 6: ResultsDisplay

**Files:**
- Modify: `src/features/calculator/components/ResultsDisplay/ResultsDisplay.tsx`
- Create: `src/features/calculator/components/ResultsDisplay/ResultsDisplay.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/ResultsDisplay/ResultsDisplay.module.css`:

```css
.heading {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--mantine-color-dark-4);
  padding-bottom: 8px;
  margin: 0;
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `ResultsDisplay.tsx`:

```tsx
"use client";

import { CombatResult } from "@/lib/calculator/types";
import { Alert, Stack } from "@/ui";
import { DirectionTable } from "./components/DirectionTable/DirectionTable";
import styles from "./ResultsDisplay.module.css";

interface Props {
  result: CombatResult;
}

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
        <DirectionTable result={result.counterattack} title="Counterattack" />
      )}
    </Stack>
  );
};

export default ResultsDisplay;
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/ResultsDisplay/ResultsDisplay.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/ResultsDisplay/
git commit -m "refactor: migrate ResultsDisplay to CSS modules"
```

---

## Task 7: CombatForm

**Files:**
- Modify: `src/features/calculator/components/CombatForm/CombatForm.tsx`
- Create: `src/features/calculator/components/CombatForm/CombatForm.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/features/calculator/components/CombatForm/CombatForm.module.css`:

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

.capitalizeButton {
  text-transform: capitalize;
}

.calculateButton {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 2: Update the component**

Replace the entire contents of `CombatForm.tsx`:

```tsx
"use client";

import { CombatFormState, Phase, FirstFighter } from "@/lib/calculator/types";
import { UNIT_LIST, UNITS } from "@/data/units";
import {
  Button,
  Select,
  NumberInput,
  Checkbox,
  Paper,
  Stack,
  Group,
} from "@/ui";
import { WeaponSelector } from "./components/WeaponSelector/WeaponSelector";
import {
  AttackerContextSection,
  relevantContextFlags,
} from "./components/AttackerContextSection/AttackerContextSection";
import styles from "./CombatForm.module.css";

interface Props {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
}

const UNIT_DATA = UNIT_LIST.map((u) => ({ value: u.id, label: u.name }));

const CombatForm = ({ state, onChange, onCalculate }: Props) => {
  const handlePhaseChange = (phase: Phase) => {
    const attackerUnit = UNITS[state.attackerUnitId];
    const defenderUnit = UNITS[state.defenderUnitId];
    const attackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const defenderPool = defenderUnit.meleeWeapons;
    onChange({
      ...state,
      phase,
      attackerWeapons:
        attackerPool.length > 0 ? [{ weaponName: attackerPool[0].name }] : [],
      defenderWeapons:
        defenderPool.length > 0 ? [{ weaponName: defenderPool[0].name }] : [],
    });
  };

  const handleAttackerUnitChange = (unitId: string) => {
    const unit = UNITS[unitId];
    const pool =
      state.phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
    onChange({
      ...state,
      attackerUnitId: unitId,
      attackerWeapons: pool.length > 0 ? [{ weaponName: pool[0].name }] : [],
    });
  };

  const handleDefenderUnitChange = (unitId: string) => {
    const unit = UNITS[unitId];
    onChange({
      ...state,
      defenderUnitId: unitId,
      defenderWeapons:
        unit.meleeWeapons.length > 0
          ? [{ weaponName: unit.meleeWeapons[0].name }]
          : [],
    });
  };

  const toggleAttackerWeapon = (weaponName: string) => {
    const isSelected = state.attackerWeapons.some(
      (w) => w.weaponName === weaponName
    );
    if (isSelected) {
      onChange({
        ...state,
        attackerWeapons: state.attackerWeapons.filter(
          (w) => w.weaponName !== weaponName
        ),
      });
    } else {
      onChange({
        ...state,
        attackerWeapons: [...state.attackerWeapons, { weaponName }],
      });
    }
  };

  const setAttackerWeaponCount = (weaponName: string, count: number) => {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.map((w) =>
        w.weaponName === weaponName ? { ...w, modelCount: count } : w
      ),
    });
  };

  const moveAttackerWeaponUp = (weaponName: string) => {
    const idx = state.attackerWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  };

  const moveAttackerWeaponDown = (weaponName: string) => {
    const idx = state.attackerWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  };

  const toggleDefenderWeapon = (weaponName: string) => {
    const isSelected = state.defenderWeapons.some(
      (w) => w.weaponName === weaponName
    );
    if (isSelected) {
      onChange({
        ...state,
        defenderWeapons: state.defenderWeapons.filter(
          (w) => w.weaponName !== weaponName
        ),
      });
    } else {
      onChange({
        ...state,
        defenderWeapons: [...state.defenderWeapons, { weaponName }],
      });
    }
  };

  const setDefenderWeaponCount = (weaponName: string, count: number) => {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.map((w) =>
        w.weaponName === weaponName ? { ...w, modelCount: count } : w
      ),
    });
  };

  const moveDefenderWeaponUp = (weaponName: string) => {
    const idx = state.defenderWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  };

  const moveDefenderWeaponDown = (weaponName: string) => {
    const idx = state.defenderWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  };

  const attackerUnit = UNITS[state.attackerUnitId];
  const defenderUnit = UNITS[state.defenderUnitId];
  const attackerWeaponPool =
    state.phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons;

  const attackerContextFlags = relevantContextFlags(
    attackerWeaponPool,
    state.attackerWeapons
  );
  const defenderContextFlags = relevantContextFlags(
    defenderUnit.meleeWeapons,
    state.defenderWeapons
  );

  return (
    <Stack gap="md">
      {/* Phase selector */}
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
      </div>

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
                  weapons={defenderUnit.meleeWeapons}
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
                className={styles.capitalizeButton}
              >
                {f}
              </Button>
            ))}
          </Group>
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        color="green"
        onClick={onCalculate}
        className={styles.calculateButton}
      >
        Calculate
      </Button>
    </Stack>
  );
};

export default CombatForm;
```

- [ ] **Step 3: Verify no inline styles remain**

```bash
grep -n "style={{" src/features/calculator/components/CombatForm/CombatForm.tsx
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/CombatForm/
git commit -m "refactor: migrate CombatForm to CSS modules"
```

---

## Task 8: page.tsx

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/page.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/app/page.module.css`:

```css
.main {
  max-width: 896px;
  margin: 0 auto;
  padding: 40px 16px;
}

.header {
  text-align: center;
}

.title {
  font-size: 36px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mantine-color-yellow-4);
  margin: 0;
}

.subtitle {
  color: var(--mantine-color-dimmed);
  font-size: 14px;
  margin: 0;
}

.error {
  margin-top: 12px;
  color: var(--mantine-color-red-4);
  font-size: 14px;
}
```

- [ ] **Step 2: Update page.tsx**

Add the import at the top of `page.tsx` (after the existing imports):
```tsx
import styles from "./page.module.css";
```

Replace the inline styles:

| Element | Old | New |
|---|---|---|
| `<main>` | `style={{ maxWidth: "896px", margin: "0 auto", padding: "40px 16px" }}` | `className={styles.main}` |
| `<header>` | `style={{ textAlign: "center" }}` | `className={styles.header}` |
| `<h1>` | `style={{ fontSize: "36px", fontWeight: 900, ... }}` | `className={styles.title}` |
| `<p>` (subtitle) | `style={{ color: "var(--mantine-color-dimmed)", ... }}` | `className={styles.subtitle}` |
| `<p>` (error) | `style={{ marginTop: "12px", color: "var(--mantine-color-red-4)", ... }}` | `className={styles.error}` |

- [ ] **Step 3: Verify no inline styles remain anywhere**

```bash
grep -rn "style={{" src/
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/
git commit -m "refactor: migrate page.tsx to CSS modules"
```

---

## Final verification

- [ ] **Run the dev server and visually verify the app looks correct**

```bash
npm run dev
```

Open `http://localhost:3000` and check:
- Page header (yellow title, dimmed subtitle)
- Combat form (yellow Attacker heading, blue Defender heading, phase buttons)
- Weapon selector (weapon cards, toggle buttons in yellow)
- Results display (yellow heading, results table with yellow averages)

- [ ] **Run lint**

```bash
npm run lint
```

Expected: no errors.
