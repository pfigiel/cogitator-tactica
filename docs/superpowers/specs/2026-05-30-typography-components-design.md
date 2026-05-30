# Typography Components Design

**Date:** 2026-05-30  
**Task:** TASK-4

## Overview

Add two typography components to `packages/ui-kit`: `Text` and `Title`. Both are thin wrappers around Mantine components, consistent with all existing ui-kit components.

## Components

### Text

Wraps Mantine's `Text` with `component="span"` fixed.

**Props:**

| Prop      | Type                                   | Required | Description        |
| --------- | -------------------------------------- | -------- | ------------------ |
| children  | ReactNode                              | yes      | Content            |
| className | string                                 | no       | CSS class override |
| size      | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | no       | Font size token    |

**Rendering:** Always a `<span>`. Size maps directly to Mantine's `size` prop (Mantine Text natively supports these tokens).

### Title

Wraps Mantine's `Title`.

**Props:**

| Prop      | Type                                   | Required | Description                                              |
| --------- | -------------------------------------- | -------- | -------------------------------------------------------- |
| children  | ReactNode                              | yes      | Content                                                  |
| className | string                                 | no       | CSS class override                                       |
| order     | `1 \| 2 \| 3 \| 4 \| 5 \| 6`           | yes      | Heading level (h1–h6), also controls default visual size |
| size      | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | no       | Overrides visual font size when provided                 |

**Rendering:** `<h{order}>`. If `size` is omitted, visual size derived from `order` (Mantine default). If `size` is provided, passed as `fz={size}` to override (Mantine Box style props accept `fz` with xs/sm/md/lg/xl tokens).

## File Structure

```
packages/ui-kit/src/
  Text/
    Text.tsx
    index.ts
  Title/
    Title.tsx
    index.ts
```

Both exported from `packages/ui-kit/src/index.ts`.

## Implementation Notes

- No CSS modules — Mantine handles all styling
- `Size` type shared or duplicated inline (no shared types file exists in ui-kit)
- Pattern matches existing components: `import { X as MantineX, XProps } from "@mantine/core"`
