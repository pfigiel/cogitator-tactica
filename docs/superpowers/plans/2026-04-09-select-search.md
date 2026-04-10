# Select Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `minSearchLength` prop to the `Select` wrapper that hides options until the user has typed at least N characters, and wire it up on the unit selects in `CombatForm`.

**Architecture:** The `Select` wrapper gains a `SearchProps` discriminated union that makes `minSearchLength` only valid when `searchable: true`. Internal `searchValue` state drives a data filter: when the query is shorter than the threshold, only the currently selected item is surfaced (so the displayed label doesn't vanish). Mantine handles the rest of the filtering when the threshold is met.

**Tech Stack:** React (useState), Mantine Select, TypeScript discriminated unions, Vitest

---

### Task 1: Add `filterDataBySearchLength` helper and unit test

**Files:**
- Create: `src/ui/Select.test.ts`
- Modify: `src/ui/Select.tsx`

The filtering logic is a pure function — extract and test it before wiring into the component.

- [ ] **Step 1: Write the failing test**

Create `src/ui/Select.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterDataBySearchLength } from "./Select";

const DATA = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("filterDataBySearchLength", () => {
  it("returns empty array when query is shorter than threshold and nothing is selected", () => {
    expect(filterDataBySearchLength(DATA, "ab", 3, null)).toEqual([]);
  });

  it("returns only the selected item when query is shorter than threshold", () => {
    expect(filterDataBySearchLength(DATA, "ab", 3, "b")).toEqual([
      { value: "b", label: "Beta" },
    ]);
  });

  it("returns full data when query meets threshold", () => {
    expect(filterDataBySearchLength(DATA, "alp", 3, null)).toEqual(DATA);
  });

  it("returns full data when query exceeds threshold", () => {
    expect(filterDataBySearchLength(DATA, "alpha", 3, "a")).toEqual(DATA);
  });

  it("returns full data when minSearchLength is not set (undefined)", () => {
    expect(filterDataBySearchLength(DATA, "", undefined, null)).toEqual(DATA);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/ui/Select.test.ts
```

Expected: FAIL — `filterDataBySearchLength` is not exported.

- [ ] **Step 3: Export `filterDataBySearchLength` from `Select.tsx`**

Add to `src/ui/Select.tsx` (above the component):

```ts
export type SelectDataItem = { value: string; label: string };

export function filterDataBySearchLength(
  data: SelectDataItem[],
  searchValue: string,
  minSearchLength: number | undefined,
  selectedValue: string | null
): SelectDataItem[] {
  if (minSearchLength === undefined || searchValue.length >= minSearchLength) {
    return data;
  }
  if (selectedValue === null) return [];
  return data.filter((item) => item.value === selectedValue);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/ui/Select.test.ts
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Select.tsx src/ui/Select.test.ts
git commit -m "feat: add filterDataBySearchLength helper with tests"
```

---

### Task 2: Update `Select` component with `SearchProps` type and `minSearchLength` behaviour

**Files:**
- Modify: `src/ui/Select.tsx`

- [ ] **Step 1: Replace the component with the full updated version**

Replace the entire contents of `src/ui/Select.tsx` with:

```tsx
import { useState } from "react";
import { Select as MantineSelect, SelectProps, ElementProps } from "@mantine/core";

export type SelectDataItem = { value: string; label: string };

export function filterDataBySearchLength(
  data: SelectDataItem[],
  searchValue: string,
  minSearchLength: number | undefined,
  selectedValue: string | null
): SelectDataItem[] {
  if (minSearchLength === undefined || searchValue.length >= minSearchLength) {
    return data;
  }
  if (selectedValue === null) return [];
  return data.filter((item) => item.value === selectedValue);
}

type SearchProps =
  | { searchable: true; minSearchLength?: number }
  | { searchable?: false | undefined; minSearchLength?: never };

type Props = Omit<SelectProps & ElementProps<"input", keyof SelectProps>, "searchable"> &
  SearchProps;

export function Select({ minSearchLength, searchable, data, value, onChange, ...rest }: Props) {
  const [searchValue, setSearchValue] = useState("");

  const filteredData =
    minSearchLength !== undefined && Array.isArray(data)
      ? filterDataBySearchLength(
          data as SelectDataItem[],
          searchValue,
          minSearchLength,
          value ?? null
        )
      : data;

  return (
    <MantineSelect
      {...rest}
      searchable={searchable}
      data={filteredData}
      value={value}
      onChange={onChange}
      searchValue={minSearchLength !== undefined ? searchValue : undefined}
      onSearchChange={minSearchLength !== undefined ? setSearchValue : undefined}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Select.tsx
git commit -m "feat: add SearchProps type and minSearchLength to Select wrapper"
```

---

### Task 3: Wire up `searchable` and `minSearchLength` on unit selects in `CombatForm`

**Files:**
- Modify: `src/components/CombatForm.tsx`

- [ ] **Step 1: Add props to both unit Selects**

In `src/components/CombatForm.tsx`, find the two `<Select label="Unit" ...>` occurrences (lines ~483 and ~537) and add `searchable minSearchLength={3}` to each:

```tsx
<Select
  label="Unit"
  searchable
  minSearchLength={3}
  value={state.attackerUnitId}
  onChange={(value) => value && handleAttackerUnitChange(value)}
  data={UNIT_DATA}
/>
```

```tsx
<Select
  label="Unit"
  searchable
  minSearchLength={3}
  value={state.defenderUnitId}
  onChange={(value) => value && handleDefenderUnitChange(value)}
  data={UNIT_DATA}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Smoke test in browser**

```bash
npm run dev
```

Open the app, click a unit select — the dropdown should be empty. Type 3+ characters (e.g. "spa") — matching units appear. The currently selected unit label should remain visible at all times.

- [ ] **Step 5: Commit**

```bash
git add src/components/CombatForm.tsx
git commit -m "feat: enable search with 3-char minimum on unit selects"
```
