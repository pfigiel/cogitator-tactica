# Prettier + ESLint Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure Prettier and ESLint with `eslint-config-prettier` so formatting and linting work without conflicts.

**Architecture:** Prettier handles all formatting; ESLint handles code quality rules. `eslint-config-prettier` is placed last in the ESLint flat config to disable any ESLint rules that would conflict with Prettier's output.

**Tech Stack:** `prettier`, `eslint`, `eslint-config-prettier`, `@eslint/js`, `typescript-eslint`

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (devDependencies updated by npm)

- [ ] **Step 1: Install all devDependencies**

```bash
npm install --save-dev prettier eslint eslint-config-prettier @eslint/js typescript-eslint
```

Expected output: packages added to `node_modules`, `package-lock.json` updated, `package.json` devDependencies includes all five packages.

- [ ] **Step 2: Verify installation**

```bash
node_modules/.bin/eslint --version
node_modules/.bin/prettier --version
```

Expected: both print a version string (e.g. `9.x.x` and `3.x.x`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install prettier, eslint, and related packages"
```

---

### Task 2: Create ESLint flat config

**Files:**
- Create: `eslint.config.mjs`

- [ ] **Step 1: Create the config file**

Create `eslint.config.mjs` at the repo root with:

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

- [ ] **Step 2: Run ESLint to verify the config loads**

```bash
node_modules/.bin/eslint src/app/page.tsx
```

Expected: output lists any lint errors/warnings, or `0 errors` — no "Could not find config file" or import errors.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: add ESLint flat config with typescript-eslint and prettier"
```

---

### Task 3: Create Prettier config and ignore file

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc`**

Create `.prettierrc` at the repo root with:

```json
{}
```

(Empty object — uses Prettier defaults. Rules will be added separately.)

- [ ] **Step 2: Create `.prettierignore`**

Create `.prettierignore` at the repo root with:

```
node_modules
.next
out
dist
build
*.lock
package-lock.json
```

- [ ] **Step 3: Verify Prettier picks up the config**

```bash
node_modules/.bin/prettier --check src/app/page.tsx
```

Expected: either `All matched files use Prettier code style!` or a list of files that need formatting — no config errors.

- [ ] **Step 4: Commit**

```bash
git add .prettierrc .prettierignore
git commit -m "chore: add Prettier config and ignore file"
```

---

### Task 4: Update package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update scripts**

In `package.json`, replace:

```json
"lint": "next lint",
```

with:

```json
"lint": "eslint src",
"format": "prettier --write .",
"format:check": "prettier --check .",
```

The full `scripts` block should look like:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "eslint src",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "vitest run",
  "test:watch": "vitest",
  "import-units": "tsx scripts/import-wahapedia/index.ts --factions SM,ORK"
},
```

- [ ] **Step 2: Verify `npm run lint` works**

```bash
npm run lint
```

Expected: ESLint runs against `src/`, prints any warnings/errors, exits cleanly (no "command not found" or config errors).

- [ ] **Step 3: Verify `npm run format:check` works**

```bash
npm run format:check
```

Expected: Prettier checks all files and either reports `All matched files use Prettier code style!` or lists files needing formatting — no errors about missing config.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: fix lint script and add format scripts"
```
