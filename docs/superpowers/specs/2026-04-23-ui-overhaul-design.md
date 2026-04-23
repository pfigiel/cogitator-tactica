# UI Overhaul Design

**Date:** 2026-04-23
**Status:** Approved

---

## Overview

A comprehensive visual refresh of Cogitator Tactica, making the prompt input the focal point of the UI, adding atmospheric Warhammer 40k lore-friendly copy, collapsing the form into an accordion, and adding auto-scroll to results.

---

## 1. Icon Library

Add `@tabler/icons-react` — free, open-source, 5000+ icons, the standard choice for Mantine apps.

---

## 2. Layout & Header

- The header block is restyled: **"Cogitator Tactica"** in yellow (`var(--mantine-color-yellow-4)`), the subtitle **"Statistics Calculator for Warhammer 40,000 10th Edition"** in dimmed gray — both in a smaller font than today.
- The existing `Paper` wrapper around `PromptInput` is removed. No background, no border — the prompt elements sit directly on the page background.

---

## 3. Prompt Section (`PromptInput` component)

### Layout

- Centered on the page, ~80% width of the content column.
- Atmospheric tagline above the input (centered, italic, dimmed text):
  > _"Describe the engagement parameters. Probability matrices will be computed and rendered for your strategic calculus."_
- Multiline `Textarea` (replaces the current `TextInput`), default border color (no yellow border).
- Two buttons below the textarea, each `flex: 1`, spanning the full textarea width with a small gap between them:
  - **PARSE REPORT** — secondary/default styling. Fills the form from the prompt, auto-expands the form accordion, and scrolls the accordion into view.
  - **INITIATE SIMULATION** — yellow/filled styling. Fills the form from the prompt AND runs the simulation, then scrolls results into view.

### Props change

`PromptInput` gains an `onSimulate` callback prop (alongside the existing `onParse`).

### Wrapper

No `Paper` wrapper. Remove any background or border from the current container.

---

## 4. Form Section (`CombatForm` component)

### Accordion

- `CombatForm` is wrapped in a Mantine `Accordion` component (add thin wrapper at `src/ui/Accordion/`).
- Accordion header label: **"Combat Parameters"**.
- Default state: **collapsed**.
- Auto-expands when "PARSE REPORT" is clicked; the accordion header scrolls into view after expansion.
- User can manually toggle open/closed at any time.

### Phase Selector

- Remove the "PHASE" label entirely.
- "Shooting" and "Melee" buttons become wider and are horizontally centered.
- Each button gets a `@tabler/icons-react` icon before its label:
  - Shooting → `IconCrosshair`
  - Melee → `IconSword`
- Active phase button uses the yellow/orange accent color (matching existing active style).

### Weapon Selector

- "Selected weapons" and "Available weapons" panels get a visually distinct background — one shade darker than their parent (use `dark-9` or `var(--mantine-color-dark-9)`).
- The `+` and `-` buttons on weapon records adopt the same yellow/orange accent color as the active phase button.

### Calculate Button

- Renamed: **Engage Cogitator** (sentence case, not all-caps).
- Styled: yellow/filled, matching "INITIATE SIMULATION".
- On click: runs the simulation and scrolls the results section into view.

---

## 5. Results Section (`ResultsDisplay` component)

- No structural changes.
- Auto-scrolls into view whenever a simulation completes — whether triggered by "INITIATE SIMULATION" or "Engage Cogitator".
- Implementation: attach a `ref` to the results container in `page.tsx`; call `ref.current.scrollIntoView({ behavior: 'smooth' })` after the calculation result is set.

---

## 6. New UI Components

**`src/ui/Accordion/`** — thin Mantine `Accordion` wrapper, consistent with existing `src/ui/` wrappers (Paper, Button, etc.).

**`src/ui/Textarea/`** — thin Mantine `Textarea` wrapper, consistent with the existing `TextInput` wrapper.

---

## 7. Out of Scope

- No changes to calculation logic, API routes, or data types.
- No changes to `ResultsDisplay` internal structure.
- No changes to `AttackerContextSection` or defender panel beyond what is implicit in the form accordion wrapper.
