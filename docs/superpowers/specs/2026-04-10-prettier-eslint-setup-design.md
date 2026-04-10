# Prettier + ESLint Setup

**Date:** 2026-04-10
**Status:** Approved

## Context

The project (Next.js 16 + TypeScript + Mantine) has no formatter or linter configured. Next.js 16 removed the built-in `next lint` command, so the existing `"lint": "next lint"` script is broken. No ESLint packages are currently installed.

## Goal

Set up Prettier as the code formatter and ESLint as the linter, integrated via `eslint-config-prettier` so the two tools don't conflict. Specific formatting and linting rules will be configured separately in follow-up work.

## Dependencies

All installed as `devDependencies`:

- `prettier` — code formatter
- `eslint` — linter runtime
- `eslint-config-prettier` — disables ESLint rules that conflict with Prettier (must appear last in ESLint config)
- `@eslint/js` — recommended JS rules (`eslint:recommended` equivalent for flat config)
- `typescript-eslint` — unified TypeScript parser and rules package

## Files

### `eslint.config.mjs`

Flat config format (standard for modern ESLint). Layers:
1. `eslint.configs.recommended` — baseline JS rules
2. `tseslint.configs.recommended` — TypeScript rules with type-aware parsing
3. `prettierConfig` — disables rules that conflict with Prettier (must be last)

```js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
);
```

No `@next/eslint-plugin-next` — not available for Next.js 16 flat config.

### `.prettierrc`

Empty object `{}` — Prettier defaults apply. Rules will be added in follow-up prompts.

### `.prettierignore`

Excludes: `node_modules`, `.next`, build output, generated files.

## Scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `lint` | `eslint src` | Replaces broken `next lint` |
| `format` | `prettier --write .` | Format all files |
| `format:check` | `prettier --check .` | CI check without writing |
