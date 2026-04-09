# UI System Design

**Date:** 2026-04-09
**Status:** Approved

## Overview

Introduce a `src/ui` folder as a proxy/facade layer over Mantine, a fully-styled, CSS-module-based component library. All application code imports UI components exclusively from `@/ui` — never directly from `@mantine/core`. Tailwind is removed entirely.

## Goals

1. Establish `src/ui` as the single source of UI components for the application.
2. Adopt Mantine as the component library (free, popular, native CSS via CSS modules, fully themeable).
3. Remove Tailwind CSS completely.
4. Hardcode dark mode with a WH40K-appropriate color scheme.

## Library Choice

**Mantine v7** — chosen over alternatives for:
- Completely free, no paid tiers
- ~28k GitHub stars, mature ecosystem
- CSS modules (no CSS-in-JS, satisfies native CSS requirement)
- Full theming via CSS variables
- Ships production-ready components, reducing styling work

## Architecture

### Folder structure

```
src/ui/
  theme.ts          ← Mantine theme (dark mode, yellow primary)
  index.ts          ← barrel export
  Button.tsx
  TextInput.tsx
  NumberInput.tsx
  Select.tsx
  Checkbox.tsx
  Table.tsx
  Paper.tsx
  Alert.tsx
```

### Wrapper pattern

Each component is a thin prop-forwarding wrapper:

```tsx
// src/ui/Button.tsx
import { Button as MantineButton, ButtonProps } from '@mantine/core'

export function Button(props: ButtonProps) {
  return <MantineButton {...props} />
}
```

App-wide defaults (e.g. `Paper` padding, `radius`) are set inside the wrapper, not at every call site. Library-specific theming overrides live in `theme.ts` under `components`.

App code example:
```tsx
import { Button, Paper } from '@/ui'
```

### Theme

```ts
// src/ui/theme.ts
import { createTheme } from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'yellow',
  defaultColorScheme: 'dark',
})
```

- `primaryColor: 'yellow'` — gold/Imperial tone, fits WH40K aesthetic
- `defaultColorScheme: 'dark'` — hardcoded dark mode; Mantine's dark palette provides the background colors (no custom `html` background needed in CSS)
- No custom color tuples — uses Mantine's built-in palettes

### MantineProvider wiring

`MantineProvider` and the Mantine CSS import go in `src/app/layout.tsx`:

```tsx
import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'
import { theme } from '@/ui/theme'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  )
}
```

`globals.css` is deleted entirely — background color is owned by Mantine's dark color scheme.

## Component Inventory

Components introduced in this session — only those currently used in the application:

| `src/ui` export | Mantine component | Default overrides |
|---|---|---|
| `Button` | `Button` | — |
| `TextInput` | `TextInput` | — |
| `NumberInput` | `NumberInput` | — |
| `Select` | `Select` | JS-powered dropdown with future search support |
| `Checkbox` | `Checkbox` | — |
| `Table` | `Table` | — |
| `Paper` | `Paper` | `p="md"`, `radius="md"` |
| `Alert` | `Alert` | — |

All wrappers re-export their Mantine prop types, so app code has full access to Mantine's API through the `@/ui` boundary.

## Tailwind Removal

- Remove `tailwindcss`, `@tailwindcss/postcss`, `autoprefixer` from `package.json`
- Remove `postcss.config.*`
- Delete `globals.css`
- Remove all Tailwind class strings from components during migration

## Migration Order

1. Install `@mantine/core` + `@mantine/hooks`, wire `MantineProvider` in `layout.tsx`, delete Tailwind
2. Build `src/ui/theme.ts`, all wrappers, and `src/ui/index.ts`
3. Migrate `PromptInput.tsx` — TextInput, Button
4. Migrate `CombatForm.tsx` — Button, Select, NumberInput, Checkbox
5. Migrate `ResultsDisplay.tsx` — Table, Alert
6. Migrate `page.tsx` — Paper, layout

## Out of Scope

- Light mode / theme toggling (separate future task)
- Components not yet used in the application
- Typography system, spacing tokens, or other design system primitives beyond what's needed today
