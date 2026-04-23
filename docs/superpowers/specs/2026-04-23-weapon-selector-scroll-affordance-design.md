# WeaponSelector — Scroll Affordance Design

## Problem

The "Available weapons" list in `WeaponSelector` is wrapped in a `ScrollAreaAutosize` with `mah={270}`. Mantine hides the scrollbar thumb when the user is not scrolling, making it non-obvious that the area is scrollable. Additionally, neither the selected nor the available weapons sections have any visual container to distinguish them from surrounding content.

## Solution

### Bordered section containers

Wrap both the "Selected weapons" and "Available weapons" sections in a `Paper withBorder p="xs"` component. This matches the existing `WeaponRecord` card style and provides the visual separation needed to read each section as a distinct, contained unit.

### Gradient fade (scroll affordance) — baked into ScrollArea components

The gradient fade is implemented as an optional feature of `ScrollArea` and `ScrollAreaAutosize` in the UI library, not in `WeaponSelector` itself.

**New prop:** `withFadeGradient?: boolean` — when true, activates the smart gradient overlay.

**Gradient element:** A `div` wraps the Mantine scroll area with `position: relative`. A `::after` pseudo-element on that wrapper produces:

- Height: ~52px
- Default background: `linear-gradient(to bottom, transparent, var(--mantine-color-body))`
- `pointer-events: none` so clicks pass through

**Customisation:** Both components accept an optional `classNames?: { gradient?: string }` prop. When provided, the `gradient` class is merged onto the gradient element, allowing callers to override the gradient color (e.g. to match a `Paper` background instead of `--mantine-color-body`).

`ScrollArea` and `ScrollAreaAutosize` each expose this same `withFadeGradient` / `classNames` API independently, since they are separate components.

### Dynamic gradient visibility

The gradient is shown or hidden based on scroll state, avoiding false affordance cues:

- **No flicker on mount** — a `useLayoutEffect` checks `scrollHeight > clientHeight` on the viewport element synchronously, before the browser paints. This means the correct initial `showGradient` state is committed to the DOM in the same frame as the first render — no flash of incorrect state.
- **Adapts to content changes** — after mount, a `ResizeObserver` watches the viewport element (accessed via Mantine's `viewportRef` prop). Whenever the observed size changes, it re-runs the same `scrollHeight > clientHeight` check.
- **Hidden at bottom** — Mantine's `onScrollPositionChange` fires on every scroll event with `{x, y}`. When `scrollTop + clientHeight >= scrollHeight - 8` (8px threshold for subpixel rendering), the gradient is hidden. It reappears if the user scrolls back up.

State is a single `boolean` (`showGradient`) managed inside the component. The `ResizeObserver` is cleaned up on unmount.

## Files changed

- `src/ui/ScrollArea/ScrollArea.tsx` — add `withFadeGradient` prop and `classNames.gradient` slot to both `ScrollArea` and `ScrollAreaAutosize`; manage `showGradient` state with viewport ref + ResizeObserver
- `src/ui/ScrollArea/ScrollArea.module.css` — new file with `.wrapper` (position: relative) and `.gradient` (the overlay) styles
- `WeaponSelector.tsx` — add `Paper` wrappers around both sections; pass `withFadeGradient` to `ScrollAreaAutosize`

## Out of scope

- Changes to the "Selected weapons" scroll behaviour (it is not constrained in height)
