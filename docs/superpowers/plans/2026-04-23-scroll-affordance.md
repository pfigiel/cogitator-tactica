# Scroll Affordance — Fade Gradient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a smart, flicker-free fade gradient to `ScrollArea`/`ScrollAreaAutosize` that signals scrollable overflow, and apply it to the WeaponSelector's available weapons list inside bordered section cards.

**Architecture:** Gradient logic lives entirely inside `src/ui/ScrollArea/ScrollArea.tsx`. A new `withFadeGradient` prop wraps the Mantine component in a `position: relative` div; a conditionally-rendered gradient `div` is shown/hidden via a `showGradient` boolean state. The initial state is set synchronously by `useLayoutEffect` (no flicker), maintained by a `ResizeObserver`, and updated by Mantine's `onScrollPositionChange`. WeaponSelector wraps both sections in `Paper withBorder` cards and passes `withFadeGradient` to `ScrollAreaAutosize`.

**Tech Stack:** React 19, TypeScript, Mantine v9, CSS Modules, Vitest, `clsx` (already a dependency)

---

## File Map

| File                                                                                         | Action     | Responsibility                                                                     |
| -------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `src/ui/ScrollArea/ScrollArea.module.css`                                                    | **Create** | Wrapper positioning + gradient overlay styles                                      |
| `src/ui/ScrollArea/ScrollArea.tsx`                                                           | **Modify** | `withFadeGradient` prop, gradient state, `checkGradient` logic                     |
| `src/ui/ScrollArea/gradientVisibility.ts`                                                    | **Create** | Pure `shouldShowGradient` function (testable)                                      |
| `src/ui/ScrollArea/gradientVisibility.test.ts`                                               | **Create** | Tests for `shouldShowGradient`                                                     |
| `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx` | **Modify** | `Paper` wrappers around both sections + `withFadeGradient` on `ScrollAreaAutosize` |

---

## Task 1: Create `gradientVisibility.ts` — pure gradient decision logic

**Files:**

- Create: `src/ui/ScrollArea/gradientVisibility.ts`

The component reads `scrollHeight`, `clientHeight`, and `scrollTop` from the viewport DOM element and decides whether the gradient is visible. Extracting this as a pure function makes it testable without a DOM.

- [ ] **Step 1: Create the file**

```ts
const BOTTOM_THRESHOLD = 8;

export const shouldShowGradient = (
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
): boolean => {
  const hasOverflow = scrollHeight > clientHeight;
  const atBottom = scrollTop + clientHeight >= scrollHeight - BOTTOM_THRESHOLD;
  return hasOverflow && !atBottom;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/ScrollArea/gradientVisibility.ts
git commit -m "feat: extract shouldShowGradient pure function"
```

---

## Task 2: Test `shouldShowGradient`

**Files:**

- Create: `src/ui/ScrollArea/gradientVisibility.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect } from "vitest";
import { shouldShowGradient } from "./gradientVisibility";

describe("shouldShowGradient", () => {
  it("returns false when content fits without scrolling", () => {
    expect(shouldShowGradient(200, 200, 0)).toBe(false);
  });

  it("returns false when content is shorter than viewport", () => {
    expect(shouldShowGradient(100, 200, 0)).toBe(false);
  });

  it("returns true when content overflows and user is at the top", () => {
    expect(shouldShowGradient(400, 200, 0)).toBe(true);
  });

  it("returns true when scrolled partway but not to bottom", () => {
    expect(shouldShowGradient(400, 200, 100)).toBe(true);
  });

  it("returns false when scrolled exactly to bottom", () => {
    // scrollTop(200) + clientHeight(200) = scrollHeight(400)
    expect(shouldShowGradient(400, 200, 200)).toBe(false);
  });

  it("returns false when within 8px threshold of bottom", () => {
    // scrollTop(193) + clientHeight(200) = 393, scrollHeight(400) - 8 = 392
    expect(shouldShowGradient(400, 200, 193)).toBe(false);
  });

  it("returns true when just outside the 8px threshold", () => {
    // scrollTop(192) + clientHeight(200) = 392, scrollHeight(400) - 8 = 392 — boundary
    expect(shouldShowGradient(400, 200, 191)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests and confirm they pass**

```bash
npx vitest run src/ui/ScrollArea/gradientVisibility.test.ts
```

Expected output: 7 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/ui/ScrollArea/gradientVisibility.test.ts
git commit -m "test: add shouldShowGradient tests"
```

---

## Task 3: Create `ScrollArea.module.css`

**Files:**

- Create: `src/ui/ScrollArea/ScrollArea.module.css`

The wrapper provides the stacking context for the absolutely-positioned gradient overlay.

- [ ] **Step 1: Create the file**

```css
.wrapper {
  position: relative;
}

.gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 52px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--mantine-color-body)
  );
  pointer-events: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/ScrollArea/ScrollArea.module.css
git commit -m "feat: add ScrollArea CSS module for gradient overlay"
```

---

## Task 4: Implement `withFadeGradient` in `ScrollArea.tsx`

**Files:**

- Modify: `src/ui/ScrollArea/ScrollArea.tsx`

Add `withFadeGradient` and `classNames.gradient` to both `ScrollArea` and `ScrollAreaAutosize`. The implementation is identical for both — the only difference is the underlying Mantine component being wrapped.

**Key TypeScript approach for `classNames`:** Use `Omit<MantineProps, 'classNames'>` then redefine `classNames` as the Mantine type intersected with `{ gradient?: string }`. Inside the component, destructure `gradient` before spreading the rest to Mantine.

- [ ] **Step 1: Replace the contents of `ScrollArea.tsx`**

```tsx
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ScrollArea as MantineScrollArea,
  ScrollAreaProps,
  ScrollAreaAutosizeProps,
} from "@mantine/core";
import clsx from "clsx";
import { shouldShowGradient } from "./gradientVisibility";
import styles from "./ScrollArea.module.css";

type ScrollAreaClassNames = NonNullable<ScrollAreaProps["classNames"]> & {
  gradient?: string;
};

type AutosizeClassNames = NonNullable<ScrollAreaAutosizeProps["classNames"]> & {
  gradient?: string;
};

type Props = Omit<ScrollAreaProps, "classNames"> & {
  classNames?: ScrollAreaClassNames;
  withFadeGradient?: boolean;
};

type AutosizeProps = Omit<ScrollAreaAutosizeProps, "classNames"> & {
  classNames?: AutosizeClassNames;
  withFadeGradient?: boolean;
};

const useGradient = (enabled: boolean) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  const check = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setShow(shouldShowGradient(el.scrollHeight, el.clientHeight, el.scrollTop));
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;
    check();
    const observer = new ResizeObserver(check);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [enabled, check]);

  return { viewportRef, show, check };
};

export const ScrollArea = ({
  withFadeGradient,
  classNames,
  onScrollPositionChange,
  ...props
}: Props) => {
  const { viewportRef, show, check } = useGradient(!!withFadeGradient);
  const { gradient: gradientClass, ...mantineClassNames } = (classNames ??
    {}) as ScrollAreaClassNames;

  const handleScroll = useCallback(
    (pos: { x: number; y: number }) => {
      if (withFadeGradient) check();
      onScrollPositionChange?.(pos);
    },
    [withFadeGradient, check, onScrollPositionChange],
  );

  return (
    <div className={withFadeGradient ? styles.wrapper : undefined}>
      <MantineScrollArea
        viewportRef={withFadeGradient ? viewportRef : undefined}
        onScrollPositionChange={
          withFadeGradient ? handleScroll : onScrollPositionChange
        }
        classNames={mantineClassNames as ScrollAreaProps["classNames"]}
        {...props}
      />
      {withFadeGradient && show && (
        <div className={clsx(styles.gradient, gradientClass)} />
      )}
    </div>
  );
};

export const ScrollAreaAutosize = ({
  withFadeGradient,
  classNames,
  onScrollPositionChange,
  ...props
}: AutosizeProps) => {
  const { viewportRef, show, check } = useGradient(!!withFadeGradient);
  const { gradient: gradientClass, ...mantineClassNames } = (classNames ??
    {}) as AutosizeClassNames;

  const handleScroll = useCallback(
    (pos: { x: number; y: number }) => {
      if (withFadeGradient) check();
      onScrollPositionChange?.(pos);
    },
    [withFadeGradient, check, onScrollPositionChange],
  );

  return (
    <div className={withFadeGradient ? styles.wrapper : undefined}>
      <MantineScrollArea.Autosize
        viewportRef={withFadeGradient ? viewportRef : undefined}
        onScrollPositionChange={
          withFadeGradient ? handleScroll : onScrollPositionChange
        }
        classNames={mantineClassNames as ScrollAreaAutosizeProps["classNames"]}
        {...props}
      />
      {withFadeGradient && show && (
        <div className={clsx(styles.gradient, gradientClass)} />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains about the `classNames` cast, the cast `as ScrollAreaProps["classNames"]` on line passing `mantineClassNames` to Mantine is correct — Mantine's type doesn't know about our custom `gradient` slot and we've already removed it via destructuring.

- [ ] **Step 3: Commit**

```bash
git add src/ui/ScrollArea/ScrollArea.tsx
git commit -m "feat: add withFadeGradient prop to ScrollArea and ScrollAreaAutosize"
```

---

## Task 5: Update `WeaponSelector.tsx`

**Files:**

- Modify: `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx`

Wrap both sections in `Paper withBorder p="xs"` and pass `withFadeGradient` to `ScrollAreaAutosize`. Also remove the now-unused `ScrollArea` import.

- [ ] **Step 1: Replace the contents of `WeaponSelector.tsx`**

```tsx
import type { SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Paper, ScrollAreaAutosize, Stack } from "@/ui";
import { WeaponRecord } from "./components/WeaponRecord";
import styles from "./WeaponSelector.module.css";

type Props = {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  weaponType: "shooting" | "melee";
  onToggle: (weaponId: string) => void;
  onCountChange: (weaponId: string, count: number) => void;
  onMoveUp: (weaponId: string) => void;
  onMoveDown: (weaponId: string) => void;
};

export const WeaponSelector = ({
  weapons,
  selected,
  defaultModelCount,
  weaponType,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: Props) => {
  if (weapons.length === 0) return null;

  const selectedWeapons = selected
    .map((s) => ({
      profile: weapons.find((w) => w.id === s.weaponId),
      entry: s,
    }))
    .filter(
      (x): x is { profile: WeaponProfile; entry: SelectedWeapon } =>
        x.profile !== undefined,
    );

  const availableWeapons = weapons.filter(
    (w) => !selected.some((s) => s.weaponId === w.id),
  );

  return (
    <Stack gap="xs">
      <Paper withBorder p="xs">
        <Stack gap="xs">
          <span className={styles.dimmed}>Selected weapons</span>
          {selectedWeapons.length === 0 ? (
            <span className={styles.dimmed}>No weapons selected</span>
          ) : (
            selectedWeapons.map((sw, idx) => (
              <WeaponRecord
                key={sw.profile.id}
                weapon={sw.profile}
                weaponType={weaponType}
                isSelected={true}
                onToggle={() => onToggle(sw.profile.id)}
                selectionProps={{
                  modelCount: sw.entry.modelCount ?? defaultModelCount,
                  onCountChange: (val) => onCountChange(sw.profile.id, val),
                  onMoveUp: () => onMoveUp(sw.profile.id),
                  onMoveDown: () => onMoveDown(sw.profile.id),
                  isFirst: idx === 0,
                  isLast: idx === selectedWeapons.length - 1,
                }}
              />
            ))
          )}
        </Stack>
      </Paper>
      <Paper withBorder p="xs">
        <Stack gap="xs">
          <span className={styles.dimmed}>Available weapons</span>
          {availableWeapons.length === 0 ? (
            <span className={styles.dimmed}>No weapons available</span>
          ) : (
            <ScrollAreaAutosize mah={270} withFadeGradient>
              <Stack gap="xs">
                {availableWeapons.map((w) => (
                  <WeaponRecord
                    key={w.id}
                    weapon={w}
                    weaponType={weaponType}
                    isSelected={false}
                    onToggle={() => onToggle(w.id)}
                  />
                ))}
              </Stack>
            </ScrollAreaAutosize>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
};
```

- [ ] **Step 2: Check for TypeScript errors and linting**

```bash
npx tsc --noEmit && npx eslint src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx
```

Expected: no errors or warnings (the unused `ScrollArea` import is now removed).

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx
git commit -m "feat: add Paper borders and scroll gradient to WeaponSelector"
```

---

## Task 6: Manual smoke test

Start the dev server and verify the feature works end to end.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to the calculator and select a unit with many weapons**

Open the app, pick a unit that has more available weapons than fit in 270px (typically 5+ weapons). Confirm:

1. The "Selected weapons" section has a visible border.
2. The "Available weapons" section has a visible border.
3. The gradient fade appears at the bottom of the available weapons list when it overflows.
4. Scrolling the list to the bottom makes the gradient disappear.
5. Scrolling back up makes the gradient reappear.
6. Selecting weapons until the list no longer overflows causes the gradient to disappear.

- [ ] **Step 3: Commit if any fixes were needed, then stop the server**

---

## Self-Review

**Spec coverage:**

- ✅ `withFadeGradient` prop on both `ScrollArea` and `ScrollAreaAutosize` — Task 4
- ✅ `classNames.gradient` slot for overriding gradient color — Task 4
- ✅ Flicker-free initial check via `useLayoutEffect` — Task 4 (`useGradient` hook)
- ✅ Adapt to content changes via `ResizeObserver` — Task 4 (`useGradient` hook)
- ✅ Hide at bottom via `onScrollPositionChange` — Task 4 (`handleScroll`)
- ✅ Both sections wrapped in `Paper withBorder` — Task 5
- ✅ `withFadeGradient` passed to `ScrollAreaAutosize` in WeaponSelector — Task 5
- ✅ Unused `ScrollArea` import removed from WeaponSelector — Task 5

**Placeholder scan:** None found.

**Type consistency:**

- `shouldShowGradient` defined in Task 1, imported in Task 4 — ✅
- `useGradient` hook defined and used entirely within Task 4 — ✅
- `gradientClass` destructured from `classNames` in both components consistently — ✅
- `styles.gradient` referenced in CSS (Task 3) and TSX (Task 4) — ✅
