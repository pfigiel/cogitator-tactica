# WeaponSelector — Scroll Affordance Design

## Problem

The "Available weapons" list in `WeaponSelector` is wrapped in a `ScrollAreaAutosize` with `mah={270}`. Mantine hides the scrollbar thumb when the user is not scrolling, making it non-obvious that the area is scrollable. Additionally, neither the selected nor the available weapons sections have any visual container to distinguish them from surrounding content.

## Solution

### Bordered section containers

Wrap both the "Selected weapons" and "Available weapons" sections in a `Paper withBorder p="xs"` component. This matches the existing `WeaponRecord` card style and provides the visual separation needed to read each section as a distinct, contained unit.

### Gradient fade (scroll affordance) — baked into ScrollArea components

The gradient fade is implemented as an optional feature of `ScrollArea` and `ScrollAreaAutosize` in the UI library, not in `WeaponSelector` itself.

**New prop:** `withFadeGradient?: boolean` — when true, renders a gradient overlay anchored to the bottom of the scroll area.

**Gradient element:** A `div` wraps the Mantine scroll area with `position: relative`. A `::after` pseudo-element on that wrapper produces:

- Height: ~52px
- Default background: `linear-gradient(to bottom, transparent, var(--mantine-color-body))`
- `pointer-events: none` so clicks pass through

**Customisation:** Both components accept an optional `classNames?: { gradient?: string }` prop. When provided, the `gradient` class is merged onto the gradient element, allowing callers to override the gradient color (e.g. to match a `Paper` background instead of `--mantine-color-body`).

`ScrollArea` and `ScrollAreaAutosize` each expose this same `withFadeGradient` / `classNames` API independently, since they are separate components.

The gradient always renders when `withFadeGradient` is true. When the list fits without scrolling it is barely perceptible; when the list overflows it creates a strong directional cue.

## Files changed

- `src/ui/ScrollArea/ScrollArea.tsx` — add `withFadeGradient` prop and `classNames.gradient` slot to both `ScrollArea` and `ScrollAreaAutosize`; render gradient element conditionally
- `src/ui/ScrollArea/ScrollArea.module.css` — new file with `.wrapper` (position: relative) and `.gradient` (the overlay) styles
- `WeaponSelector.tsx` — add `Paper` wrappers around both sections; pass `withFadeGradient` to `ScrollAreaAutosize`

## Out of scope

- Dynamically hiding the gradient when content does not overflow (adds JS complexity for minimal gain)
- Changes to the "Selected weapons" scroll behaviour (it is not constrained in height)
