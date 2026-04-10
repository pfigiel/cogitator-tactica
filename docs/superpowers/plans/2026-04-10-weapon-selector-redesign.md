# Weapon Selector Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the checkbox-based `WeaponSelector` with a two-section layout (Selected / Available) where weapons are moved between sections using `+` and `−` buttons.

**Architecture:** All changes are confined to the `WeaponSelector` function component and the two toggle handlers in `CombatForm`. The props interface is unchanged so parent state, LLM integration, and `AttackerContextSection` are untouched. The empty-selected-list guard in the toggle handlers is removed since an empty list is now valid.

**Tech Stack:** React, TypeScript, Mantine UI (via `src/ui` wrappers — `Button`, `Stack`, `Group`, `NumberInput`)

---

### Task 1: Remove the empty-list guard from both toggle handlers

**Files:**
- Modify: `src/components/CombatForm.tsx:316-412`

There are currently guards that prevent deselecting the last weapon. With the new design, an empty selected list is valid, so these guards must go.

- [ ] **Step 1: Remove guard from `toggleAttackerWeapon`**

In `src/components/CombatForm.tsx`, replace:

```ts
function toggleAttackerWeapon(weaponName: string) {
  const isSelected = state.attackerWeapons.some(
    (w) => w.weaponName === weaponName
  );
  if (isSelected) {
    if (state.attackerWeapons.length <= 1) return;
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.filter(
        (w) => w.weaponName !== weaponName
      ),
    });
  } else {
    onChange({
      ...state,
      attackerWeapons: [...state.attackerWeapons, { weaponName }],
    });
  }
}
```

with:

```ts
function toggleAttackerWeapon(weaponName: string) {
  const isSelected = state.attackerWeapons.some(
    (w) => w.weaponName === weaponName
  );
  if (isSelected) {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.filter(
        (w) => w.weaponName !== weaponName
      ),
    });
  } else {
    onChange({
      ...state,
      attackerWeapons: [...state.attackerWeapons, { weaponName }],
    });
  }
}
```

- [ ] **Step 2: Remove guard from `toggleDefenderWeapon`**

In `src/components/CombatForm.tsx`, replace:

```ts
function toggleDefenderWeapon(weaponName: string) {
  const isSelected = state.defenderWeapons.some(
    (w) => w.weaponName === weaponName
  );
  if (isSelected) {
    if (state.defenderWeapons.length <= 1) return;
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.filter(
        (w) => w.weaponName !== weaponName
      ),
    });
  } else {
    onChange({
      ...state,
      defenderWeapons: [...state.defenderWeapons, { weaponName }],
    });
  }
}
```

with:

```ts
function toggleDefenderWeapon(weaponName: string) {
  const isSelected = state.defenderWeapons.some(
    (w) => w.weaponName === weaponName
  );
  if (isSelected) {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.filter(
        (w) => w.weaponName !== weaponName
      ),
    });
  } else {
    onChange({
      ...state,
      defenderWeapons: [...state.defenderWeapons, { weaponName }],
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CombatForm.tsx
git commit -m "feat: allow empty weapon selection list"
```

---

### Task 2: Rewrite `WeaponSelector` with two-section layout

**Files:**
- Modify: `src/components/CombatForm.tsx:24-144`

Replace the entire `WeaponSelector` function. The props signature stays identical.

- [ ] **Step 1: Replace `WeaponSelector`**

In `src/components/CombatForm.tsx`, replace the entire function from `function WeaponSelector(` through its closing `}` (lines 24–144) with:

```tsx
function WeaponSelector({
  weapons,
  selected,
  defaultModelCount,
  color,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  color: string;
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}) {
  if (weapons.length === 0) return null;

  const selectedWeapons = selected
    .map((s) => weapons.find((w) => w.name === s.weaponName))
    .filter((w): w is WeaponProfile => w !== undefined);

  const availableWeapons = weapons.filter(
    (w) => !selected.some((s) => s.weaponName === w.name)
  );

  const dimmed = { fontSize: "12px", color: "var(--mantine-color-dimmed)" };

  return (
    <Stack gap="xs">
      {/* Selected weapons */}
      <Stack gap="xs">
        <label style={dimmed}>Selected weapons</label>
        {selectedWeapons.length === 0 ? (
          <span style={dimmed}>No weapons selected</span>
        ) : (
          selectedWeapons.map((w) => {
            const selIdx = selected.findIndex((s) => s.weaponName === w.name);
            const count = selected[selIdx].modelCount ?? defaultModelCount;
            const isFirst = selIdx === 0;
            const isLast = selIdx === selected.length - 1;

            return (
              <Group key={w.name} gap="xs" wrap="wrap">
                <span>
                  {w.name}
                  <span style={{ marginLeft: "8px", ...dimmed }}>
                    {weaponStats(w)}
                  </span>
                </span>
                <Group gap="xs" align="center">
                  <span style={dimmed}>models:</span>
                  <NumberInput
                    size="xs"
                    w={70}
                    min={1}
                    max={500}
                    value={count}
                    onChange={(val) =>
                      onCountChange(
                        w.name,
                        typeof val === "number" ? Math.max(1, val) : 1
                      )
                    }
                  />
                </Group>
                {selected.length > 1 && (
                  <Stack gap="2px">
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={() => onMoveUp(w.name)}
                      disabled={isFirst}
                      aria-label={`Move ${w.name} up`}
                    >
                      ▲
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={() => onMoveDown(w.name)}
                      disabled={isLast}
                      aria-label={`Move ${w.name} down`}
                    >
                      ▼
                    </Button>
                  </Stack>
                )}
                <Button
                  size="compact-xs"
                  variant="subtle"
                  color={color}
                  onClick={() => onToggle(w.name)}
                  aria-label={`Remove ${w.name}`}
                >
                  −
                </Button>
              </Group>
            );
          })
        )}
      </Stack>

      {/* Available weapons */}
      <Stack gap="xs">
        <label style={dimmed}>Available weapons</label>
        {availableWeapons.length === 0 ? (
          <span style={dimmed}>No weapons available</span>
        ) : (
          availableWeapons.map((w) => (
            <Group key={w.name} gap="xs">
              <span>
                {w.name}
                <span style={{ marginLeft: "8px", ...dimmed }}>
                  {weaponStats(w)}
                </span>
              </span>
              <Button
                size="compact-xs"
                variant="subtle"
                color={color}
                onClick={() => onToggle(w.name)}
                aria-label={`Add ${w.name}`}
              >
                +
              </Button>
            </Group>
          ))
        )}
      </Stack>
    </Stack>
  );
}
```

- [ ] **Step 2: Verify the app renders correctly**

Run the dev server and manually verify:
```bash
npm run dev
```
Open the app in the browser. Check:
1. Attacker section shows "Selected weapons" with the default first weapon, and "Available weapons" listing the rest.
2. Clicking `+` on an available weapon moves it to the selected list.
3. Clicking `−` on a selected weapon moves it back to available.
4. When only one weapon is selected, `▲`/`▼` buttons are not shown.
5. When more than one weapon is selected, `▲`/`▼` buttons appear and are disabled at the top/bottom.
6. Removing the last selected weapon shows "No weapons selected".
7. When all weapons are selected, "No weapons available" is shown.
8. The LLM input (if wired up) sets initial weapon state correctly in both sections.

- [ ] **Step 3: Commit**

```bash
git add src/components/CombatForm.tsx
git commit -m "feat: replace checkbox weapon selector with two-section add/remove UI"
```
