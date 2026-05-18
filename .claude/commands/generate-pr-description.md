Generate a concise, technically precise PR description. Target: senior developers. Favor specificity over verbosity.

## Steps

1. `git fetch origin main`
2. `git rev-parse --abbrev-ref HEAD` — extract task ID from branch name (e.g. `feature/task-11` → `task-11`)
3. Find matching task file: `ls backlog/tasks/ | grep -i "<task-id>"` — read it for context (title, requirements, acceptance criteria)
4. Find related docs: `ls docs/superpowers/specs/ docs/superpowers/plans/` — grep by keywords from task title for matching spec/plan files, read relevant ones
5. `git diff origin/main...HEAD` — get full diff
6. `git log origin/main..HEAD --oneline` — review commits
7. Generate description in format below using task + docs context to explain the "why"
8. Output raw MD code block (copyable). No file. Inline only.

If user specifies different base branch, use that instead of `origin/main`.
If branch has no task ID, skip steps 3–4.

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
