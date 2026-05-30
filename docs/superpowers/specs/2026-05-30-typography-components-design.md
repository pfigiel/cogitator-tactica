# Typography Components Design

**Date:** 2026-05-30  
**Task:** TASK-4

## Overview

Add two typography components to `packages/ui-kit`: `Text` and `Title`. Components use PostCSS mixins for all typography styling. The mixins are also exported for use on any arbitrary element.

## PostCSS Mixins

Install `postcss-mixins` and configure it in `apps/web/postcss.config.ts`.

Define separate mixin sets for text and title in `packages/ui-kit/src/typography.css`:

```css
@define-mixin text-xs {
  font-size: var(--mantine-font-size-xs);
  line-height: 1.4;
  letter-spacing: 0;
}
@define-mixin text-sm { ... }
@define-mixin text-md { ... }
@define-mixin text-lg { ... }
@define-mixin text-xl { ... }

@define-mixin title-xs { ... }
@define-mixin title-sm { ... }
@define-mixin title-md { ... }
@define-mixin title-lg { ... }
@define-mixin title-xl { ... }
```

`text-*` and `title-*` mixins each set: `font-size` (Mantine CSS variable), `line-height`, `letter-spacing`. Title mixins will have tighter line-height and stronger negative letter-spacing appropriate for headings.

**External use:** `typography.css` is exported from `packages/ui-kit/src/index.ts` as a CSS file so consumers can import it and use the mixins in their own CSS.

## Components

Both components use CSS modules that `@mixin` the appropriate size mixin. Mantine's `size`/`fz` props are NOT used — all sizing comes from CSS.

### Text

Wraps Mantine's `Text` with `component="span"` fixed. Applies size mixin via CSS module class.

**Props:**

| Prop      | Type                                   | Required | Description        |
| --------- | -------------------------------------- | -------- | ------------------ |
| children  | ReactNode                              | yes      | Content            |
| className | string                                 | no       | CSS class override |
| size      | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | no       | Font size token    |

**Rendering:** Always a `<span>`.

### Title

Wraps Mantine's `Title`. `order` controls HTML element and default visual size via mixin; `size` overrides when provided.

**Props:**

| Prop      | Type                                   | Required | Description                                              |
| --------- | -------------------------------------- | -------- | -------------------------------------------------------- |
| children  | ReactNode                              | yes      | Content                                                  |
| className | string                                 | no       | CSS class override                                       |
| order     | `1 \| 2 \| 3 \| 4 \| 5 \| 6`           | yes      | Heading level (h1–h6), also controls default visual size |
| size      | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | no       | Overrides visual font size when provided                 |

**Size → order default mapping** (when `size` omitted):

| order | default size |
| ----- | ------------ |
| 1     | xl           |
| 2     | lg           |
| 3     | md           |
| 4     | sm           |
| 5     | xs           |
| 6     | xs           |

## File Structure

```
packages/ui-kit/src/
  typography.css          ← mixin definitions, exported for external use
  Text/
    Text.tsx
    Text.module.css
    index.ts
  Title/
    Title.tsx
    Title.module.css
    index.ts
```

Both components and `typography.css` exported from `packages/ui-kit/src/index.ts`.

## Implementation Notes

- `Size` type (`"xs" | "sm" | "md" | "lg" | "xl"`) defined inline in each component — no shared types file exists in ui-kit
- Pattern matches existing components: `import { X as MantineX, XProps } from "@mantine/core"`
- `postcss-mixins` must be added to `apps/web/postcss.config.ts` with `mixinsFiles` pointing to `typography.css`
- PostCSS config in `apps/web` is the only PostCSS config in the project
