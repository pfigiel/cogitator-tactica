# ui-kit

Shared component library for Cogitator Tactica, built on top of Mantine v9.

## Responsibilities

- Re-exports and thin wrappers around Mantine components with project-specific defaults
- Shared theme, CSS variables, and breakpoints
- Mantine `Provider` setup for consuming apps

## Usage

```ts
import { Button, Stack, theme } from "@cogitator-tactica/ui-kit";
```

The package is consumed directly from source (`"main": "src/index.ts"`) — no build step required.

## Structure

```
src/
  index.ts         # Public API
  theme.ts         # Mantine theme config
  breakpoints.ts   # Breakpoint constants
  variables.css    # CSS custom properties
  breakpoints.css  # CSS media query definitions
  Provider.tsx     # MantineProvider wrapper
  Button/
  Accordion/
  Alert/
  ...              # Other component wrappers
```

## Scripts

| Command          | Description |
| ---------------- | ----------- |
| `pnpm lint`      | Lint        |
| `pnpm typecheck` | Type-check  |
| `pnpm test`      | Run tests   |
