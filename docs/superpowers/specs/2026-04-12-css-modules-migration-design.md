# CSS Modules Migration Design

**Date:** 2026-04-12

## Problem

All component styling is currently done via inline `style` props. This is hard to maintain, cannot be statically analyzed, and makes conditional/responsive styling awkward.

## Goal

Replace all inline `style` props with co-located CSS module files. No inline styles should remain after the migration.

---

## Architecture

### Co-location convention

Each component that needs styles gets a CSS module file placed next to it:

```
WeaponRecord/
  WeaponRecord.tsx
  WeaponRecord.module.css    ← new
  weaponFormatters.ts
```

### Import convention

```ts
import styles from "./WeaponRecord.module.css";
// applied as: className={styles.foo}
```

### Conditional classes

`clsx` (new dependency, `npm install clsx`) is used wherever class names must be composed conditionally:

```ts
import clsx from "clsx";
// e.g. className={clsx(styles.heading, isActive && styles.active)}
```

This establishes the pattern for future conditional styling even where current cases are static.

### Color tokens

Mantine CSS variables (`--mantine-color-yellow-4`, `--mantine-color-dimmed`, `--mantine-color-dark-4`, etc.) are used freely inside `.module.css` files — they are available globally via Mantine's theme provider.

### No shared globals

No shared utility CSS file is introduced. The repeated Mantine variable references are short enough that duplication across module files is acceptable.

---

## Prop changes

Three components currently accept a `color` prop used purely to thread a Mantine color string into child components or inline styles. These props are dropped and a single color is hardcoded instead.

| Component                | Change                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `WeaponRecord`           | Remove `color: MantineColor` prop. Hardcode `color="yellow"` on the toggle `Button`.               |
| `WeaponSelector`         | Remove `color` prop (was only forwarded to `WeaponRecord`).                                        |
| `AttackerContextSection` | Remove `color` prop. Hardcode `color="yellow"` on each `Checkbox`.                                 |
| `DirectionTable`         | Remove `color` prop. The `<h3>` heading becomes yellow via a CSS class instead of an inline style. |
| `CombatForm`             | Stop passing `color` to `WeaponSelector` and `AttackerContextSection`.                             |
| `ResultsDisplay`         | Stop passing `color` to `DirectionTable`.                                                          |

---

## Migration order

Components are migrated leaf-first to keep each step independently reviewable:

1. `WeaponRecord`
2. `WeaponTable`
3. `AttackerContextSection`
4. `DirectionTable`
5. `WeaponSelector`
6. `ResultsDisplay`
7. `CombatForm`
8. `page.tsx`

Each step: remove all inline `style` props from the component, write the equivalent rules into a new `.module.css` file, update `className` props accordingly, and drop any `color` prop as specified above.

---

## Out of scope

- Mantine component props such as `color`, `variant`, `size` — these are Mantine's own design system props and are not inline styles.
- Responsive breakpoints or new visual changes — this migration is style-neutral (same appearance, different mechanism).
