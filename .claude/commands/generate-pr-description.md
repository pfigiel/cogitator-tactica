Generate a concise, technically precise PR description. Target: senior developers. Favor specificity over verbosity.

## Steps

1. `git fetch origin main`
2. `git diff origin/main...HEAD` — get full diff
3. `git log origin/main..HEAD --oneline` — review commits
4. Generate description in format below
5. Output raw MD code block (copyable). No file. Inline only.

If user specifies different base branch, use that instead of `origin/main`.

## Output Format

```md
## Overview

- <what changed and why>
- <additional bullets if needed>

## Technical Details

- `FileName.tsx`: <specific change>
- `util.ts`: <specific change>

## Screenshots
```

## Rules

- Bullets throughout
- Technical Details: one bullet per significant file — `` `filename` ``: description
- Screenshots section always present, always empty
- Name files, functions, logic — no vague summaries

## Example

```md
## Overview

- Added `INTERNAL_TRANSFER` support to transaction table and list
- Refactored `getIndicatorStatus` — extracted to separate util with tests

## Technical Details

- `buildAmountPerspective.ts`: Added support for internal transfer dual amounts
- `mapDtoToTransaction.ts`: Extracts `sourceBalanceId` and `targetBalanceId` from `additionalInformation`
- `TransactionAvatar.tsx`: Added internal transfer avatar and indicator support

## Screenshots
```

## Mistakes to Avoid

| Mistake                                   | Fix                          |
| ----------------------------------------- | ---------------------------- |
| "Exciting new features", "future-proofed" | Name actual feature and file |
| "Minor updates", "Fixed stuff"            | Specify what changed and how |
| Vague summaries without file names        | List affected files          |
| Long prose                                | Use bullet points            |
| Missing Screenshots section               | Always include it            |
