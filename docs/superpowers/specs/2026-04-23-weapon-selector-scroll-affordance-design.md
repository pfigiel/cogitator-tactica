# WeaponSelector — Scroll Affordance Design

## Problem

The "Available weapons" list in `WeaponSelector` is wrapped in a `ScrollAreaAutosize` with `mah={270}`. Mantine hides the scrollbar thumb when the user is not scrolling, making it non-obvious that the area is scrollable. Additionally, neither the selected nor the available weapons sections have any visual container to distinguish them from surrounding content.

## Solution

### Bordered section containers

Wrap both the "Selected weapons" and "Available weapons" sections in a `Paper withBorder p="xs"` component. This matches the existing `WeaponRecord` card style and provides the visual separation needed to read each section as a distinct, contained unit.

### Gradient fade (scroll affordance)

Inside the "Available weapons" `Paper`, wrap the `ScrollAreaAutosize` in a `position: relative` div (`.scrollWrapper`). A CSS `::after` pseudo-element renders a gradient overlay anchored to the bottom of the wrapper:

- Height: ~52px
- Background: `linear-gradient(to bottom, transparent, var(--mantine-color-body))`
- `pointer-events: none` so clicks pass through to list items

The gradient always renders. When the list fits without scrolling it is barely perceptible; when the list overflows it creates a strong directional cue that more content exists below.

## Files changed

- `WeaponSelector.tsx` — add `Paper` wrappers around both sections; add `.scrollWrapper` div around `ScrollAreaAutosize`
- `WeaponSelector.module.css` — add `.scrollWrapper` (relative positioning) and `.scrollWrapper::after` (gradient overlay)

## Out of scope

- Dynamically hiding the gradient when content does not overflow (adds JS complexity for minimal gain)
- Changes to the "Selected weapons" scroll behaviour (it is not constrained in height)
