# Typography Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Text` and `Title` components to `packages/ui-kit`, backed by custom CSS variables and PostCSS mixins that are also usable on any arbitrary element.

**Architecture:** Custom typography CSS variables are injected globally via Mantine's `cssVariablesResolver` in `UIProvider`. PostCSS mixins in `typography.css` reference those variables and are used inside CSS modules for `Text` and `Title`, but also exported for external consumers. Components wrap Mantine's `Text` (forced to `span`) and `Title`, delegating all font styling to CSS.

**Tech Stack:** React, TypeScript, Mantine 9, PostCSS, `postcss-mixins`, Vitest, `@testing-library/react`

---

## Files

| Path                                         | Action | Purpose                                                      |
| -------------------------------------------- | ------ | ------------------------------------------------------------ |
| `packages/ui-kit/src/types.ts`               | Create | `ComponentSize` shared type                                  |
| `packages/ui-kit/src/typography.css`         | Create | PostCSS mixin definitions (10 mixins)                        |
| `packages/ui-kit/src/Provider.tsx`           | Modify | Add `cssVariablesResolver` with all typography CSS variables |
| `packages/ui-kit/src/index.ts`               | Modify | Export `ComponentSize`, `Text`, `Title`, `typography.css`    |
| `packages/ui-kit/src/Text/Text.tsx`          | Create | Text component                                               |
| `packages/ui-kit/src/Text/Text.module.css`   | Create | CSS module applying text-\* mixins                           |
| `packages/ui-kit/src/Text/Text.test.tsx`     | Create | Render tests                                                 |
| `packages/ui-kit/src/Text/index.ts`          | Create | Re-export                                                    |
| `packages/ui-kit/src/Title/Title.tsx`        | Create | Title component                                              |
| `packages/ui-kit/src/Title/Title.module.css` | Create | CSS module applying title-\* mixins                          |
| `packages/ui-kit/src/Title/Title.test.tsx`   | Create | Render tests                                                 |
| `packages/ui-kit/src/Title/index.ts`         | Create | Re-export                                                    |
| `packages/ui-kit/vitest.config.ts`           | Create | jsdom env + CSS module mock for component tests              |
| `apps/web/postcss.config.ts`                 | Modify | Add `postcss-mixins` plugin with `mixinsFiles`               |

---

### Task 1: Install postcss-mixins

**Files:**

- Modify: `apps/web/postcss.config.ts`

- [ ] **Step 1: Install the package**

Run from the repo root:

```bash
pnpm add -D postcss-mixins --filter @cogitator-tactica/web
```

Expected: `postcss-mixins` appears in `apps/web/package.json` devDependencies.

- [ ] **Step 2: Add plugin to PostCSS config**

Current `apps/web/postcss.config.ts`:

```ts
import path from "path";

const config = {
  plugins: {
    "@csstools/postcss-global-data": {
      files: [
        path.resolve(
          process.cwd(),
          "../../packages/ui-kit/src/breakpoints.css",
        ),
      ],
    },
    "postcss-custom-media": {},
  },
};

export default config;
```

Replace with:

```ts
import path from "path";

const config = {
  plugins: {
    "@csstools/postcss-global-data": {
      files: [
        path.resolve(
          process.cwd(),
          "../../packages/ui-kit/src/breakpoints.css",
        ),
      ],
    },
    "postcss-custom-media": {},
    "postcss-mixins": {
      mixinsFiles: [
        path.resolve(process.cwd(), "../../packages/ui-kit/src/typography.css"),
      ],
    },
  },
};

export default config;
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/postcss.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "chore: install postcss-mixins and configure for ui-kit typography"
```

---

### Task 2: Create ComponentSize type

**Files:**

- Create: `packages/ui-kit/src/types.ts`

- [ ] **Step 1: Create the file**

```ts
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";
```

- [ ] **Step 2: Export from index.ts**

Add to `packages/ui-kit/src/index.ts`:

```ts
export type { ComponentSize } from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-kit/src/types.ts packages/ui-kit/src/index.ts
git commit -m "feat: add shared ComponentSize type to ui-kit"
```

---

### Task 3: Add typography CSS variables to UIProvider

**Files:**

- Modify: `packages/ui-kit/src/Provider.tsx`

The `cssVariablesResolver` prop on `MantineProvider` injects CSS variables into `:root` and `:host`. These are the single source of truth for typography values — the PostCSS mixins will reference them, not hardcode values.

- [ ] **Step 1: Update Provider.tsx**

```tsx
"use client";

import {
  MantineProvider,
  type MantineProviderProps,
  type CSSVariablesResolver,
} from "@mantine/core";
import { theme } from "./theme";

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--font-size-text-xs": "0.75rem",
    "--font-size-text-sm": "0.875rem",
    "--font-size-text-md": "1rem",
    "--font-size-text-lg": "1.125rem",
    "--font-size-text-xl": "1.25rem",
    "--line-height-text-xs": "1.4",
    "--line-height-text-sm": "1.45",
    "--line-height-text-md": "1.5",
    "--line-height-text-lg": "1.55",
    "--line-height-text-xl": "1.5",
    "--letter-spacing-text-xs": "0",
    "--letter-spacing-text-sm": "0",
    "--letter-spacing-text-md": "0",
    "--letter-spacing-text-lg": "0",
    "--letter-spacing-text-xl": "0",
    "--font-size-title-xs": "1rem",
    "--font-size-title-sm": "1.25rem",
    "--font-size-title-md": "1.5rem",
    "--font-size-title-lg": "2rem",
    "--font-size-title-xl": "2.5rem",
    "--line-height-title-xs": "1.3",
    "--line-height-title-sm": "1.3",
    "--line-height-title-md": "1.25",
    "--line-height-title-lg": "1.2",
    "--line-height-title-xl": "1.15",
    "--letter-spacing-title-xs": "-0.01em",
    "--letter-spacing-title-sm": "-0.01em",
    "--letter-spacing-title-md": "-0.02em",
    "--letter-spacing-title-lg": "-0.02em",
    "--letter-spacing-title-xl": "-0.03em",
  },
  light: {},
  dark: {},
});

type Props = Omit<MantineProviderProps, "theme">;

export const UIProvider = (props: Props) => (
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    {...props}
  />
);
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @cogitator-tactica/ui-kit typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui-kit/src/Provider.tsx
git commit -m "feat: add typography CSS variables via cssVariablesResolver"
```

---

### Task 4: Create typography.css with PostCSS mixins

**Files:**

- Create: `packages/ui-kit/src/typography.css`

- [ ] **Step 1: Create the file**

```css
@define-mixin text-xs {
  font-size: var(--font-size-text-xs);
  line-height: var(--line-height-text-xs);
  letter-spacing: var(--letter-spacing-text-xs);
}

@define-mixin text-sm {
  font-size: var(--font-size-text-sm);
  line-height: var(--line-height-text-sm);
  letter-spacing: var(--letter-spacing-text-sm);
}

@define-mixin text-md {
  font-size: var(--font-size-text-md);
  line-height: var(--line-height-text-md);
  letter-spacing: var(--letter-spacing-text-md);
}

@define-mixin text-lg {
  font-size: var(--font-size-text-lg);
  line-height: var(--line-height-text-lg);
  letter-spacing: var(--letter-spacing-text-lg);
}

@define-mixin text-xl {
  font-size: var(--font-size-text-xl);
  line-height: var(--line-height-text-xl);
  letter-spacing: var(--letter-spacing-text-xl);
}

@define-mixin title-xs {
  font-size: var(--font-size-title-xs);
  line-height: var(--line-height-title-xs);
  letter-spacing: var(--letter-spacing-title-xs);
}

@define-mixin title-sm {
  font-size: var(--font-size-title-sm);
  line-height: var(--line-height-title-sm);
  letter-spacing: var(--letter-spacing-title-sm);
}

@define-mixin title-md {
  font-size: var(--font-size-title-md);
  line-height: var(--line-height-title-md);
  letter-spacing: var(--letter-spacing-title-md);
}

@define-mixin title-lg {
  font-size: var(--font-size-title-lg);
  line-height: var(--line-height-title-lg);
  letter-spacing: var(--letter-spacing-title-lg);
}

@define-mixin title-xl {
  font-size: var(--font-size-title-xl);
  line-height: var(--line-height-title-xl);
  letter-spacing: var(--letter-spacing-title-xl);
}
```

CSS files cannot be re-exported from a TypeScript index file. External consumers use the mixins by importing the CSS file directly in their own CSS:

```css
@import "@cogitator-tactica/ui-kit/src/typography.css";
```

No changes to `index.ts` needed for this step.

- [ ] **Step 3: Commit**

```bash
git add packages/ui-kit/src/typography.css
git commit -m "feat: add typography PostCSS mixins"
```

---

### Task 5: Set up component testing infrastructure

**Files:**

- Create: `packages/ui-kit/vitest.config.ts`

The existing ui-kit tests are pure unit tests with no DOM. To test React components, we need jsdom and `@testing-library/react`. CSS module imports will be mocked via a Vite plugin so that `@mixin` directives don't error and `styles.xs` returns `"xs"` (key as value) — making class name assertions straightforward.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add -D @testing-library/react jsdom --filter @cogitator-tactica/ui-kit
```

Expected: both appear in `packages/ui-kit/package.json` devDependencies.

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig, type Plugin } from "vitest/config";

const cssModulesMock: Plugin = {
  name: "css-modules-mock",
  transform(_code, id) {
    if (id.endsWith(".module.css")) {
      return "export default new Proxy({}, { get: (_, key) => key });";
    }
  },
};

export default defineConfig({
  plugins: [cssModulesMock],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

The plugin intercepts `.module.css` imports at test time and returns a `Proxy` that maps any property access to the property name itself. So `styles.xs === "xs"`, `styles.md === "md"`, etc.

- [ ] **Step 3: Verify existing tests still pass**

```bash
pnpm --filter @cogitator-tactica/ui-kit test
```

Expected: existing Select and ScrollArea tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-kit/vitest.config.ts packages/ui-kit/package.json pnpm-lock.yaml
git commit -m "chore: set up component testing infrastructure in ui-kit"
```

---

### Task 6: Implement Text component (TDD)

**Files:**

- Create: `packages/ui-kit/src/Text/Text.test.tsx`
- Create: `packages/ui-kit/src/Text/Text.tsx`
- Create: `packages/ui-kit/src/Text/Text.module.css`
- Create: `packages/ui-kit/src/Text/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/ui-kit/src/Text/Text.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Text } from "./Text";

describe("Text", () => {
  it("should render a span when given children", () => {
    const { container } = render(<Text>Hello</Text>);
    expect(container.querySelector("span")).not.toBeNull();
  });

  it("should render children content", () => {
    const { getByText } = render(<Text>Hello world</Text>);
    expect(getByText("Hello world")).toBeTruthy();
  });

  it("should apply size class when size prop is provided", () => {
    const { container } = render(<Text size="lg">Hello</Text>);
    const span = container.querySelector("span");
    expect(span?.className).toContain("lg");
  });

  it("should not apply size class when size prop is omitted", () => {
    const { container } = render(<Text>Hello</Text>);
    const span = container.querySelector("span");
    expect(span?.className ?? "").not.toMatch(/\b(xs|sm|md|lg|xl)\b/);
  });

  it("should forward className prop", () => {
    const { container } = render(<Text className="custom">Hello</Text>);
    expect(container.querySelector("span")?.className).toContain("custom");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @cogitator-tactica/ui-kit test Text
```

Expected: FAIL — `Text` not found.

- [ ] **Step 3: Create CSS module**

Create `packages/ui-kit/src/Text/Text.module.css`:

```css
.xs {
  @mixin text-xs;
}

.sm {
  @mixin text-sm;
}

.md {
  @mixin text-md;
}

.lg {
  @mixin text-lg;
}

.xl {
  @mixin text-xl;
}
```

- [ ] **Step 4: Create component**

Create `packages/ui-kit/src/Text/Text.tsx`:

```tsx
import { Text as MantineText } from "@mantine/core";
import clsx from "clsx";
import type { ComponentSize } from "../types";
import styles from "./Text.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: ComponentSize;
};

const sizeClass: Record<ComponentSize, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

export const Text = ({ children, className, size }: Props) => (
  <MantineText
    component="span"
    className={clsx(size !== undefined && sizeClass[size], className)}
  >
    {children}
  </MantineText>
);
```

- [ ] **Step 5: Create index.ts**

Create `packages/ui-kit/src/Text/index.ts`:

```ts
export { Text } from "./Text";
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @cogitator-tactica/ui-kit test Text
```

Expected: all 5 tests PASS.

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @cogitator-tactica/ui-kit typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/ui-kit/src/Text/
git commit -m "feat: add Text component"
```

---

### Task 7: Implement Title component (TDD)

**Files:**

- Create: `packages/ui-kit/src/Title/Title.test.tsx`
- Create: `packages/ui-kit/src/Title/Title.tsx`
- Create: `packages/ui-kit/src/Title/Title.module.css`
- Create: `packages/ui-kit/src/Title/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/ui-kit/src/Title/Title.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Title } from "./Title";

describe("Title", () => {
  it("should render h1 when order is 1", () => {
    const { container } = render(<Title order={1}>Heading</Title>);
    expect(container.querySelector("h1")).not.toBeNull();
  });

  it("should render h3 when order is 3", () => {
    const { container } = render(<Title order={3}>Heading</Title>);
    expect(container.querySelector("h3")).not.toBeNull();
  });

  it("should apply xl size class when order is 1 and no size prop", () => {
    const { container } = render(<Title order={1}>Heading</Title>);
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("xl");
  });

  it("should apply lg size class when order is 2 and no size prop", () => {
    const { container } = render(<Title order={2}>Heading</Title>);
    const h2 = container.querySelector("h2");
    expect(h2?.className).toContain("lg");
  });

  it("should apply md size class when order is 3 and no size prop", () => {
    const { container } = render(<Title order={3}>Heading</Title>);
    expect(container.querySelector("h3")?.className).toContain("md");
  });

  it("should apply sm size class when order is 4 and no size prop", () => {
    const { container } = render(<Title order={4}>Heading</Title>);
    expect(container.querySelector("h4")?.className).toContain("sm");
  });

  it("should apply xs size class when order is 5 and no size prop", () => {
    const { container } = render(<Title order={5}>Heading</Title>);
    expect(container.querySelector("h5")?.className).toContain("xs");
  });

  it("should apply xs size class when order is 6 and no size prop", () => {
    const { container } = render(<Title order={6}>Heading</Title>);
    expect(container.querySelector("h6")?.className).toContain("xs");
  });

  it("should override size class with size prop when provided", () => {
    const { container } = render(
      <Title order={1} size="xs">
        Heading
      </Title>,
    );
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("xs");
    expect(h1?.className).not.toMatch(/\bxl\b/);
  });

  it("should forward className prop", () => {
    const { container } = render(
      <Title order={2} className="custom">
        Heading
      </Title>,
    );
    expect(container.querySelector("h2")?.className).toContain("custom");
  });

  it("should render children content", () => {
    const { getByText } = render(<Title order={1}>Page title</Title>);
    expect(getByText("Page title")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @cogitator-tactica/ui-kit test Title
```

Expected: FAIL — `Title` not found.

- [ ] **Step 3: Create CSS module**

Create `packages/ui-kit/src/Title/Title.module.css`:

```css
.xs {
  @mixin title-xs;
}

.sm {
  @mixin title-sm;
}

.md {
  @mixin title-md;
}

.lg {
  @mixin title-lg;
}

.xl {
  @mixin title-xl;
}
```

- [ ] **Step 4: Create component**

Create `packages/ui-kit/src/Title/Title.tsx`:

```tsx
import { Title as MantineTitle } from "@mantine/core";
import clsx from "clsx";
import type { ComponentSize } from "../types";
import styles from "./Title.module.css";

type Order = 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  children: React.ReactNode;
  className?: string;
  order: Order;
  size?: ComponentSize;
};

const orderToSize: Record<Order, ComponentSize> = {
  1: "xl",
  2: "lg",
  3: "md",
  4: "sm",
  5: "xs",
  6: "xs",
};

const sizeClass: Record<ComponentSize, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

export const Title = ({ children, className, order, size }: Props) => {
  const resolvedSize = size ?? orderToSize[order];
  return (
    <MantineTitle
      order={order}
      className={clsx(sizeClass[resolvedSize], className)}
    >
      {children}
    </MantineTitle>
  );
};
```

- [ ] **Step 5: Create index.ts**

Create `packages/ui-kit/src/Title/index.ts`:

```ts
export { Title } from "./Title";
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter @cogitator-tactica/ui-kit test Title
```

Expected: all 11 tests PASS.

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @cogitator-tactica/ui-kit typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/ui-kit/src/Title/
git commit -m "feat: add Title component"
```

---

### Task 8: Export Text and Title from ui-kit index

**Files:**

- Modify: `packages/ui-kit/src/index.ts`

- [ ] **Step 1: Add exports**

Add to `packages/ui-kit/src/index.ts`:

```ts
export { Text } from "./Text";
export { Title } from "./Title";
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @cogitator-tactica/ui-kit typecheck
```

Expected: no errors.

- [ ] **Step 3: Run all ui-kit tests**

```bash
pnpm --filter @cogitator-tactica/ui-kit test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-kit/src/index.ts
git commit -m "feat: export Text and Title from ui-kit"
```
