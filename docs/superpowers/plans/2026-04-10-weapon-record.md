# WeaponRecord Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline weapon rows in `WeaponSelector` with a uniform `WeaponRecord` component that has consistent height, ellipsis-trimmed names, formatted stats with yellow values, comma-separated abilities, and always-visible up/down arrows with correct disable logic.

**Architecture:** Pure formatting logic is extracted to `weaponFormatters.ts` (unit-testable). `WeaponRecord` is a presentational component that takes a `WeaponProfile` and an optional `selectionProps` block — absence of `selectionProps` renders the available-weapon variant, presence renders the selected-weapon variant. `WeaponSelector` becomes a thin orchestrator that maps data into `WeaponRecord` instances.

**Tech Stack:** React 19, Mantine 9, TypeScript, Vitest

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.ts` |
| Create | `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.test.ts` |
| Create | `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.tsx` |
| Modify | `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx` |
| Modify | `src/features/calculator/components/CombatForm/CombatForm.tsx` |

---

### Task 1: Formatting helpers (TDD)

**Files:**
- Create: `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.test.ts`
- Create: `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.test.ts
import { describe, it, expect } from "vitest";
import { formatAbilityLabel, formatAbilities, formatStats } from "./weaponFormatters";
import type { WeaponAbility, WeaponProfile } from "@/lib/calculator/types";

describe("formatAbilityLabel", () => {
  it("formats ANTI ability", () => {
    const ability: WeaponAbility = { type: "ANTI", keyword: "VEHICLE", threshold: 4 };
    expect(formatAbilityLabel(ability)).toBe("Anti-VEHICLE 4+");
  });

  it("formats MELTA ability with value", () => {
    const ability: WeaponAbility = { type: "MELTA", value: 2 };
    expect(formatAbilityLabel(ability)).toBe("Melta 2");
  });

  it("formats RAPID_FIRE ability with value", () => {
    const ability: WeaponAbility = { type: "RAPID_FIRE", value: 1 };
    expect(formatAbilityLabel(ability)).toBe("Rapid Fire 1");
  });

  it("formats SUSTAINED_HITS ability with value", () => {
    const ability: WeaponAbility = { type: "SUSTAINED_HITS", value: 3 };
    expect(formatAbilityLabel(ability)).toBe("Sustained Hits 3");
  });

  it("formats TWIN_LINKED ability", () => {
    const ability: WeaponAbility = { type: "TWIN_LINKED" };
    expect(formatAbilityLabel(ability)).toBe("Twin-linked");
  });

  it("formats DEVASTATING_WOUNDS ability", () => {
    const ability: WeaponAbility = { type: "DEVASTATING_WOUNDS" };
    expect(formatAbilityLabel(ability)).toBe("Devastating Wounds");
  });

  it("formats IGNORES_COVER ability", () => {
    const ability: WeaponAbility = { type: "IGNORES_COVER" };
    expect(formatAbilityLabel(ability)).toBe("Ignores Cover");
  });
});

describe("formatAbilities", () => {
  it("returns empty string for empty abilities array", () => {
    expect(formatAbilities([])).toBe("");
  });

  it("returns single ability label for one ability", () => {
    expect(formatAbilities([{ type: "LETHAL_HITS" }])).toBe("Lethal Hits");
  });

  it("returns comma-separated labels for multiple abilities", () => {
    expect(
      formatAbilities([{ type: "LETHAL_HITS" }, { type: "TWIN_LINKED" }])
    ).toBe("Lethal Hits, Twin-linked");
  });
});

describe("formatStats", () => {
  const weapon: WeaponProfile = {
    name: "Bolter",
    attacks: 2,
    skill: 3,
    strength: 4,
    ap: 1,
    damage: 1,
    abilities: [],
  };

  it("uses BS label for shooting weapons", () => {
    const stats = formatStats(weapon, "shooting");
    expect(stats[0]).toEqual({ label: "BS", value: "3+" });
  });

  it("uses WS label for melee weapons", () => {
    const stats = formatStats(weapon, "melee");
    expect(stats[0]).toEqual({ label: "WS", value: "3+" });
  });

  it("formats all stats in correct order", () => {
    expect(formatStats(weapon, "shooting")).toEqual([
      { label: "BS", value: "3+" },
      { label: "A", value: "2" },
      { label: "S", value: "4" },
      { label: "AP-", value: "1" },
      { label: "D", value: "1" },
    ]);
  });

  it("shows AP-0 when ap is 0", () => {
    const stats = formatStats({ ...weapon, ap: 0 }, "shooting");
    expect(stats[3]).toEqual({ label: "AP-", value: "0" });
  });

  it("formats dice expression attacks as string", () => {
    const stats = formatStats({ ...weapon, attacks: "D6" }, "shooting");
    expect(stats[1]).toEqual({ label: "A", value: "D6" });
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail (module not found)**

```bash
npx vitest run src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.test.ts
```

Expected: FAIL with "Cannot find module './weaponFormatters'"

- [ ] **Step 3: Create the formatting helpers**

```typescript
// src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.ts
import type { WeaponAbility, WeaponProfile } from "@/lib/calculator/types";

export const formatAbilityLabel = (ability: WeaponAbility): string => {
  switch (ability.type) {
    case "ANTI": return `Anti-${ability.keyword} ${ability.threshold}+`;
    case "ASSAULT": return "Assault";
    case "BLAST": return "Blast";
    case "CONVERSION": return "Conversion";
    case "DEVASTATING_WOUNDS": return "Devastating Wounds";
    case "HAZARDOUS": return "Hazardous";
    case "HEAVY": return "Heavy";
    case "IGNORES_COVER": return "Ignores Cover";
    case "INDIRECT_FIRE": return "Indirect Fire";
    case "LANCE": return "Lance";
    case "LETHAL_HITS": return "Lethal Hits";
    case "LINKED_FIRE": return "Linked Fire";
    case "MELTA": return `Melta ${ability.value}`;
    case "PISTOL": return "Pistol";
    case "PRECISION": return "Precision";
    case "PSYCHIC": return "Psychic";
    case "RAPID_FIRE": return `Rapid Fire ${ability.value}`;
    case "SUSTAINED_HITS": return `Sustained Hits ${ability.value}`;
    case "TORRENT": return "Torrent";
    case "TWIN_LINKED": return "Twin-linked";
  }
};

export const formatAbilities = (abilities: WeaponAbility[]): string =>
  abilities.map(formatAbilityLabel).join(", ");

export const formatStats = (
  weapon: WeaponProfile,
  weaponType: "shooting" | "melee"
): Array<{ label: string; value: string }> => [
  { label: weaponType === "shooting" ? "BS" : "WS", value: `${weapon.skill}+` },
  { label: "A", value: String(weapon.attacks) },
  { label: "S", value: String(weapon.strength) },
  { label: "AP-", value: String(weapon.ap) },
  { label: "D", value: String(weapon.damage) },
];
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npx vitest run src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/weaponFormatters.test.ts
```

Expected: all 14 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/
git commit -m "feat: add weapon formatting helpers with tests"
```

---

### Task 2: WeaponRecord component

**Files:**
- Create: `src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.tsx`

- [ ] **Step 1: Create WeaponRecord.tsx**

```tsx
// src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.tsx
import type { WeaponProfile } from "@/lib/calculator/types";
import { Paper, Group, Stack, Button, NumberInput } from "@/ui";
import { formatStats, formatAbilities } from "./weaponFormatters";

interface SelectionProps {
  modelCount: number;
  onCountChange: (count: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

interface WeaponRecordProps {
  weapon: WeaponProfile;
  weaponType: "shooting" | "melee";
  color: string;
  isSelected: boolean;
  onToggle: () => void;
  selectionProps?: SelectionProps;
}

export const WeaponRecord = ({
  weapon,
  weaponType,
  color,
  isSelected,
  onToggle,
  selectionProps,
}: WeaponRecordProps) => {
  const stats = formatStats(weapon, weaponType);
  const abilities = formatAbilities(weapon.abilities);

  return (
    <Paper withBorder p="xs">
      <Group wrap="nowrap" align="center" gap="xs">
        <Button
          size="compact-xs"
          variant="subtle"
          color={color}
          onClick={onToggle}
          aria-label={isSelected ? `Remove ${weapon.name}` : `Add ${weapon.name}`}
          style={{ flexShrink: 0 }}
        >
          {isSelected ? "−" : "+"}
        </Button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {weapon.name}
          </div>
          <div style={{ fontSize: "11px" }}>
            {stats.map(({ label, value }) => (
              <span key={label}>
                <span style={{ color: "var(--mantine-color-dimmed)" }}>{label}</span>
                <span style={{ color: "var(--mantine-color-yellow-filled)" }}>{value}</span>{" "}
              </span>
            ))}
          </div>
          {abilities && (
            <div style={{ fontSize: "11px", color: "var(--mantine-color-dimmed)" }}>
              {abilities}
            </div>
          )}
        </div>

        {selectionProps && (
          <NumberInput
            size="xs"
            w={70}
            min={1}
            max={100}
            value={selectionProps.modelCount}
            onChange={(val) =>
              selectionProps.onCountChange(typeof val === "number" ? Math.max(1, val) : 1)
            }
            style={{ flexShrink: 0 }}
          />
        )}

        {selectionProps && (
          <Stack gap="2px" style={{ flexShrink: 0 }}>
            <Button
              size="compact-xs"
              variant="subtle"
              color={color}
              onClick={selectionProps.onMoveUp}
              disabled={selectionProps.isFirst}
              aria-label={`Move ${weapon.name} up`}
            >
              ▲
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              color={color}
              onClick={selectionProps.onMoveDown}
              disabled={selectionProps.isLast}
              aria-label={`Move ${weapon.name} down`}
            >
              ▼
            </Button>
          </Stack>
        )}
      </Group>
    </Paper>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/components/WeaponRecord/WeaponRecord.tsx
git commit -m "feat: add WeaponRecord component"
```

---

### Task 3: Update WeaponSelector

**Files:**
- Modify: `src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx`

This task replaces all inline row rendering with `WeaponRecord` and fixes the arrow bug. The fix: instead of `selected.findIndex` (which was fragile) and a `selected.length > 1` guard, use the iteration index directly — `selectedWeapons` is already ordered identically to `selected` by construction, so `idx` is the correct position.

- [ ] **Step 1: Replace WeaponSelector.tsx**

```tsx
// src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx
import type { SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { Stack } from "@/ui";
import { WeaponRecord } from "./components/WeaponRecord/WeaponRecord";

export const WeaponSelector = ({
  weapons,
  selected,
  defaultModelCount,
  color,
  weaponType,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  color: string;
  weaponType: "shooting" | "melee";
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}) => {
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
      <Stack gap="xs">
        <span style={dimmed}>Selected weapons</span>
        {selectedWeapons.length === 0 ? (
          <span style={dimmed}>No weapons selected</span>
        ) : (
          selectedWeapons.map((w, idx) => (
            <WeaponRecord
              key={w.name}
              weapon={w}
              weaponType={weaponType}
              color={color}
              isSelected={true}
              onToggle={() => onToggle(w.name)}
              selectionProps={{
                modelCount: selected[idx].modelCount ?? defaultModelCount,
                onCountChange: (val) => onCountChange(w.name, val),
                onMoveUp: () => onMoveUp(w.name),
                onMoveDown: () => onMoveDown(w.name),
                isFirst: idx === 0,
                isLast: idx === selectedWeapons.length - 1,
              }}
            />
          ))
        )}
      </Stack>
      <Stack gap="xs">
        <span style={dimmed}>Available weapons</span>
        {availableWeapons.length === 0 ? (
          <span style={dimmed}>No weapons available</span>
        ) : (
          availableWeapons.map((w) => (
            <WeaponRecord
              key={w.name}
              weapon={w}
              weaponType={weaponType}
              color={color}
              isSelected={false}
              onToggle={() => onToggle(w.name)}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: type errors on the two `WeaponSelector` usages in `CombatForm.tsx` — missing `weaponType` prop. That is expected; it will be fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/features/calculator/components/CombatForm/components/WeaponSelector/WeaponSelector.tsx
git commit -m "feat: refactor WeaponSelector to use WeaponRecord, fix arrow bug"
```

---

### Task 4: Thread weaponType through CombatForm

**Files:**
- Modify: `src/features/calculator/components/CombatForm/CombatForm.tsx`

The attacker fires with whatever phase is active (`state.phase`), so its `weaponType` is `state.phase`. The defender's `WeaponSelector` is only rendered in melee (for the counterattack), and always uses melee weapons, so its `weaponType` is always `"melee"`.

- [ ] **Step 1: Add `weaponType` to the attacker WeaponSelector call (line 255)**

Find this block in `CombatForm.tsx`:

```tsx
            <WeaponSelector
              weapons={attackerWeaponPool}
              selected={state.attackerWeapons}
              defaultModelCount={state.attackerCount}
              color="yellow"
              onToggle={toggleAttackerWeapon}
              onCountChange={setAttackerWeaponCount}
              onMoveUp={moveAttackerWeaponUp}
              onMoveDown={moveAttackerWeaponDown}
            />
```

Replace with:

```tsx
            <WeaponSelector
              weapons={attackerWeaponPool}
              selected={state.attackerWeapons}
              defaultModelCount={state.attackerCount}
              color="yellow"
              weaponType={state.phase}
              onToggle={toggleAttackerWeapon}
              onCountChange={setAttackerWeaponCount}
              onMoveUp={moveAttackerWeaponUp}
              onMoveDown={moveAttackerWeaponDown}
            />
```

- [ ] **Step 2: Add `weaponType` to the defender WeaponSelector call (line 335)**

Find this block in `CombatForm.tsx`:

```tsx
                <WeaponSelector
                  weapons={defenderUnit.meleeWeapons}
                  selected={state.defenderWeapons}
                  defaultModelCount={state.defenderCount}
                  color="blue"
                  onToggle={toggleDefenderWeapon}
                  onCountChange={setDefenderWeaponCount}
                  onMoveUp={moveDefenderWeaponUp}
                  onMoveDown={moveDefenderWeaponDown}
                />
```

Replace with:

```tsx
                <WeaponSelector
                  weapons={defenderUnit.meleeWeapons}
                  selected={state.defenderWeapons}
                  defaultModelCount={state.defenderCount}
                  color="blue"
                  weaponType="melee"
                  onToggle={toggleDefenderWeapon}
                  onCountChange={setDefenderWeaponCount}
                  onMoveUp={moveDefenderWeaponUp}
                  onMoveDown={moveDefenderWeaponDown}
                />
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/features/calculator/components/CombatForm/CombatForm.tsx
git commit -m "feat: pass weaponType to WeaponSelector from CombatForm"
```
