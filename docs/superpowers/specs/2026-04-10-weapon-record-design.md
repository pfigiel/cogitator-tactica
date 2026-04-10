# WeaponRecord Component Design

**Date:** 2026-04-10  
**Scope:** Refactor weapon rows in `WeaponSelector` into a uniform, fixed-height `WeaponRecord` component.

---

## Problem

Current weapon rows in `WeaponSelector` use `Group` with `wrap="wrap"`, causing inconsistent row heights when weapon names are long. The up/down arrow visibility is gated on `selected.length > 1`, which introduces a bug where arrow enable/disable state is wrong in edge cases.

---

## Component Location

```
src/features/calculator/components/CombatForm/components/WeaponSelector/
  components/
    WeaponRecord/
      WeaponRecord.tsx     ← new
  WeaponSelector.tsx       ← updated
```

Each component is wrapped in a folder of the same name. `WeaponRecord` is domain-specific and only used within `WeaponSelector`, so it does not live in `src/ui/`.

---

## Component API

```typescript
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
  color: string;
  isSelected: boolean;         // drives −/+ icon on the toggle button
  onToggle: () => void;
  selectionProps?: SelectionProps;  // absent = available weapon row
                                    // present = selected weapon row
}
```

---

## Layout

Each record is a `Paper` with `withBorder`, rendered as a `Group` with `wrap="nowrap"` and `align="center"`. Four columns left to right:

| Column | Width | Content |
|--------|-------|---------|
| Toggle | fixed narrow | `−` or `+` button, vertically centered |
| Name + stats | `flex: 1, minWidth: 0` | Name (ellipsis on overflow) on top; stats line below in smaller text; abilities line below stats in smaller dimmed text |
| Count | fixed ~70px | `NumberInput` (min 1, max 100); no label; only rendered when `selectionProps` present |
| Arrows | fixed narrow | `▲` / `▼` stacked buttons; only rendered when `selectionProps` present |

The `minWidth: 0` on the name+stats column is required for CSS ellipsis to work inside a flex container. Name uses `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.

---

## Stats Formatting

Order: `BS`/`WS` → `A` → `S` → `AP-` → `D`

- `weaponType === "shooting"` → `BS`; `weaponType === "melee"` → `WS`
- Skill value gets a `+` suffix: e.g. `BS3+`
- AP always shown (including `AP-0`)
- Labels rendered in dimmed color; values rendered in primary yellow (`var(--mantine-color-yellow-filled)`)

Example: `BS3+ A2 S4 AP-1 D1` with dimmed labels and yellow values.

---

## Abilities Formatting

Displayed as a third line in the name+stats column, below the stats line. Rendered in smaller dimmed text.

Format: comma-separated human-readable ability names derived from `weapon.abilities`. Each `WeaponAbility` type maps to a display string:

| Type | Display |
|------|---------|
| `ANTI` | `Anti-{keyword} {threshold}+` |
| `ASSAULT` | `Assault` |
| `BLAST` | `Blast` |
| `CONVERSION` | `Conversion` |
| `DEVASTATING_WOUNDS` | `Devastating Wounds` |
| `HAZARDOUS` | `Hazardous` |
| `HEAVY` | `Heavy` |
| `IGNORES_COVER` | `Ignores Cover` |
| `INDIRECT_FIRE` | `Indirect Fire` |
| `LANCE` | `Lance` |
| `LETHAL_HITS` | `Lethal Hits` |
| `LINKED_FIRE` | `Linked Fire` |
| `MELTA` | `Melta {value}` |
| `PISTOL` | `Pistol` |
| `PRECISION` | `Precision` |
| `PSYCHIC` | `Psychic` |
| `RAPID_FIRE` | `Rapid Fire {value}` |
| `SUSTAINED_HITS` | `Sustained Hits {value}` |
| `TORRENT` | `Torrent` |
| `TWIN_LINKED` | `Twin-linked` |

If `weapon.abilities` is empty, the abilities line is not rendered.

---

## Arrow Behavior Fix

**Current bug:** Arrows are hidden when `selected.length <= 1` via a guard condition. When the guard is removed, the single-weapon case exposes `isFirst === true` and `isLast === true` — which correctly disables both arrows — but the guard was masking this.

**Fix:**
- Remove `selected.length > 1` guard entirely
- Always render both arrows for selected weapons
- `disabled={isFirst}` on `▲`; `disabled={isLast}` on `▼`
- Audit `selIdx` derivation in `WeaponSelector` during implementation to confirm index correctness

---

## WeaponSelector Changes

- Add `weaponType: "shooting" | "melee"` prop (threaded from caller)
- Replace inline `Group` row rendering with `WeaponRecord` for both selected and available sections
- `WeaponSelector` retains: two `Stack` sections with dimmed section labels and empty-state spans
- No layout logic in `WeaponSelector` — only data mapping and prop passing

---

## Out of Scope

- Drag-and-drop reordering
- Any changes to calculator logic or types
