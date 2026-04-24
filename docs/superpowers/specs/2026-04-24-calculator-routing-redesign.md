# Calculator Routing Redesign

**Date:** 2026-04-24
**Status:** Approved

## Overview

Split the single-page calculator into two routes with a ChatGPT-style flow: a landing page for prompt input, and a results page for the form and computed results. Shared state travels between pages via a React Context handoff.

## Routing

| Route                 | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `/`                   | Permanent redirect → `/calculator`                       |
| `/calculator`         | Landing — prompt input, vertically centred               |
| `/calculator/results` | Results — form accordion + results + fixed bottom prompt |

## File Structure

```
src/app/
├── page.tsx                        # permanentRedirect('/calculator')
├── layout.tsx                      # unchanged (root layout)
└── calculator/
    ├── layout.tsx                  # CalculatorProvider wrapper
    ├── page.tsx                    # Landing page
    └── results/
        └── page.tsx                # Results page

src/features/calculator/
└── CalculatorContext.tsx           # Context + provider + hook
```

## CalculatorContext

Lives in `src/features/calculator/CalculatorContext.tsx`. Wraps both child routes via `src/app/calculator/layout.tsx`.

```ts
type CalculatorHandoff = {
  form: CombatFormState;
  prompt: string; // raw user prompt text
  autoSubmit: boolean; // true = "Engage cogitator", false = "Parse report"
};

type CalculatorContextValue = {
  handoff: CalculatorHandoff | null;
  setHandoff: (h: CalculatorHandoff) => void;
};
```

Context is a one-time handoff. After the results page mounts and reads it, all subsequent state (result, error, form edits) is local to the results page.

## /calculator — Landing Page

- Vertically centred on the full viewport height (below the header)
- Renders `<PromptInput>` (default variant)
- No large app name banner; tagline only
- On `onParsed`: calls `setHandoff({ form, prompt, autoSubmit: false })` → `router.push('/calculator/results')`
- On `onSimulate`: calls `setHandoff({ form, prompt, autoSubmit: true })` → `router.push('/calculator/results')`

## /calculator/results — Results Page

### Layout

- Full-height flex column: header (from root layout) → scrollable content area → fixed bottom bar
- No gradient above the bottom bar; hard border-top instead
- Content area has bottom padding to prevent content hiding behind the fixed bar

### Guard

If `handoff` is `null` on mount (direct URL access / hard refresh), redirect to `/calculator`.

### On mount

Reads `handoff` from context and:

1. Initialises local `form` state from `handoff.form`
2. Sets local `prompt` state from `handoff.prompt`
3. If `handoff.autoSubmit === true`: runs calculation immediately, accordion starts collapsed
4. If `handoff.autoSubmit === false`: no calculation, accordion starts open, empty results state shown

### Local state

```ts
form: CombatFormState; // editable by CombatForm
result: CombatResult | null; // computed locally
error: string | null;
prompt: string; // kept in sync with bottom input
```

Units cache is owned internally by `CombatForm` (moved down from page-level state).

### Accordion default

| Entry path                    | Default accordion state |
| ----------------------------- | ----------------------- |
| `autoSubmit: true` ("Engage") | Collapsed               |
| `autoSubmit: false` ("Parse") | Open                    |

### Empty results state

Shown when `result === null`. Dashed border card with:

- Icon
- "Awaiting calculation" heading
- Instructional copy pointing to Calculate button or bottom Engage button

### Bottom PromptInput (compact variant)

- Pre-populated with `prompt` from local state
- `onParsed`: updates local `form` + `prompt`, expands accordion, clears `result`
- `onSimulate`: updates local `form` + `prompt`, runs calculation, replaces `result`
- Also calls `setHandoff` to keep context in sync

## PromptInput Component Changes

Add two props:

```ts
compact?: boolean       // hides tagline, minRows=1, short button labels
initialPrompt?: string  // pre-populates textarea
```

Also update callback signatures to include the raw prompt, so callers can sync it:

```ts
onParsed: (state: CombatFormState, prompt: string) => void
onSimulate: (state: CombatFormState, prompt: string) => void
```

When `compact`:

- Tagline `<p>` not rendered
- `minRows={1}`
- "Parse report" → "Parse", "Engage cogitator" → "Engage"

## CombatForm Changes

Moves units cache (`units: Record<string, UnitProfile>` and `unitList`) from page-level props into internal state. `CombatForm` fetches and caches units itself. Removes those two props from its public interface.
