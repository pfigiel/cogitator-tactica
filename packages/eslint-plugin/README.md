# eslint-plugin

Custom ESLint plugin for Cogitator Tactica with project-specific rules and shared configs.

## Responsibilities

- Custom lint rules enforcing project conventions
- Shared `react` ESLint config used across apps

## Custom rules

| Rule                 | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `no-react-namespace` | Disallows `React.X` namespace access — use named imports instead |

## Usage

```js
// eslint.config.mjs
import plugin from "@cogitator-tactica/eslint-plugin";

export default [...plugin.configs.react];
```

## Structure

```
src/
  index.ts          # Plugin entry point with configs
  plugin.ts         # Plugin definition
  configs/
    react.ts        # Shared React ESLint config
  rules/
    no-react-namespace.ts       # Rule implementation
    no-react-namespace.test.ts  # Rule tests
```

## Scripts

| Command          | Description                   |
| ---------------- | ----------------------------- |
| `pnpm build`     | Compile TypeScript to `dist/` |
| `pnpm test`      | Run tests (Vitest)            |
| `pnpm typecheck` | Type-check                    |
