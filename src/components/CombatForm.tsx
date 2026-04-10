"use client";

import {
  CombatFormState,
  Phase,
  FirstFighter,
  SelectedWeapon,
  WeaponProfile,
  AttackerContext,
} from "@/lib/calculator/types";
import { UNIT_LIST, UNITS } from "@/data/units";
import { Button, Select, NumberInput, Checkbox, Paper, Stack, Group } from "@/ui";

interface Props {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
}

function weaponStats(w: WeaponProfile): string {
  return `A${w.attacks} S${w.strength} AP-${w.ap} D${w.damage}`;
}

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

function relevantContextFlags(
  weapons: WeaponProfile[],
  selected: SelectedWeapon[]
) {
  const profiles = selected
    .map((s) => weapons.find((w) => w.name === s.weaponName))
    .filter((w): w is WeaponProfile => w !== undefined);

  return {
    showStationary: profiles.some((w) =>
      w.abilities.some((a) => a.type === "HEAVY")
    ),
    showCharged: profiles.some((w) =>
      w.abilities.some((a) => a.type === "LANCE")
    ),
    showHalfRange: profiles.some((w) =>
      w.abilities.some(
        (a) => a.type === "RAPID_FIRE" || a.type === "MELTA"
      )
    ),
    showLongRange: profiles.some((w) =>
      w.abilities.some((a) => a.type === "CONVERSION")
    ),
  };
}

function AttackerContextSection({
  idPrefix,
  context,
  flags,
  color,
  onChange,
}: {
  idPrefix: string;
  context: AttackerContext;
  flags: ReturnType<typeof relevantContextFlags>;
  color: string;
  onChange: (ctx: AttackerContext) => void;
}) {
  const { showStationary, showCharged, showHalfRange, showLongRange } = flags;
  if (!showStationary && !showCharged && !showHalfRange && !showLongRange)
    return null;

  return (
    <Stack gap="xs">
      <label style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
        Conditions
      </label>
      <Stack gap="4px">
        {showStationary && (
          <Checkbox
            color={color}
            id={`${idPrefix}-stationary`}
            checked={context.remainedStationary}
            onChange={(e) =>
              onChange({ ...context, remainedStationary: e.currentTarget.checked })
            }
            label={
              <>
                Remained Stationary{" "}
                <span style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
                  (Heavy +1 to hit)
                </span>
              </>
            }
          />
        )}
        {showCharged && (
          <Checkbox
            color={color}
            id={`${idPrefix}-charged`}
            checked={context.charged}
            onChange={(e) =>
              onChange({ ...context, charged: e.currentTarget.checked })
            }
            label={
              <>
                Charged this turn{" "}
                <span style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
                  (Lance +1 to wound)
                </span>
              </>
            }
          />
        )}
        {showHalfRange && (
          <Checkbox
            color={color}
            id={`${idPrefix}-halfrange`}
            checked={context.atHalfRange}
            onChange={(e) =>
              onChange({ ...context, atHalfRange: e.currentTarget.checked })
            }
            label={
              <>
                At half range{" "}
                <span style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
                  (Rapid Fire / Melta)
                </span>
              </>
            }
          />
        )}
        {showLongRange && (
          <Checkbox
            color={color}
            id={`${idPrefix}-longrange`}
            checked={context.atLongRange}
            onChange={(e) =>
              onChange({ ...context, atLongRange: e.currentTarget.checked })
            }
            label={
              <>
                At long range{" "}
                <span style={{ fontSize: "12px", color: "var(--mantine-color-dimmed)" }}>
                  (Conversion crits on 4+)
                </span>
              </>
            }
          />
        )}
      </Stack>
    </Stack>
  );
}

const UNIT_DATA = UNIT_LIST.map((u) => ({ value: u.id, label: u.name }));

export default function CombatForm({ state, onChange, onCalculate }: Props) {
  function handlePhaseChange(phase: Phase) {
    const attackerUnit = UNITS[state.attackerUnitId];
    const defenderUnit = UNITS[state.defenderUnitId];
    const attackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const defenderPool = defenderUnit.meleeWeapons;
    onChange({
      ...state,
      phase,
      attackerWeapons:
        attackerPool.length > 0 ? [{ weaponName: attackerPool[0].name }] : [],
      defenderWeapons:
        defenderPool.length > 0 ? [{ weaponName: defenderPool[0].name }] : [],
    });
  }

  function handleAttackerUnitChange(unitId: string) {
    const unit = UNITS[unitId];
    const pool =
      state.phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
    onChange({
      ...state,
      attackerUnitId: unitId,
      attackerWeapons: pool.length > 0 ? [{ weaponName: pool[0].name }] : [],
    });
  }

  function handleDefenderUnitChange(unitId: string) {
    const unit = UNITS[unitId];
    onChange({
      ...state,
      defenderUnitId: unitId,
      defenderWeapons:
        unit.meleeWeapons.length > 0
          ? [{ weaponName: unit.meleeWeapons[0].name }]
          : [],
    });
  }

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

  function setAttackerWeaponCount(weaponName: string, count: number) {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.map((w) =>
        w.weaponName === weaponName ? { ...w, modelCount: count } : w
      ),
    });
  }

  function moveAttackerWeaponUp(weaponName: string) {
    const idx = state.attackerWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  }

  function moveAttackerWeaponDown(weaponName: string) {
    const idx = state.attackerWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  }

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

  function setDefenderWeaponCount(weaponName: string, count: number) {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.map((w) =>
        w.weaponName === weaponName ? { ...w, modelCount: count } : w
      ),
    });
  }

  function moveDefenderWeaponUp(weaponName: string) {
    const idx = state.defenderWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  }

  function moveDefenderWeaponDown(weaponName: string) {
    const idx = state.defenderWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  }

  const attackerUnit = UNITS[state.attackerUnitId];
  const defenderUnit = UNITS[state.defenderUnitId];
  const attackerWeaponPool =
    state.phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons;

  const attackerContextFlags = relevantContextFlags(
    attackerWeaponPool,
    state.attackerWeapons
  );
  const defenderContextFlags = relevantContextFlags(
    defenderUnit.meleeWeapons,
    state.defenderWeapons
  );

  return (
    <Stack gap="md">
      {/* Phase selector */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "8px",
            color: "var(--mantine-color-gray-3)",
          }}
        >
          Phase
        </label>
        <Group gap="xs">
          {(["shooting", "melee"] as Phase[]).map((p) => (
            <Button
              key={p}
              variant={state.phase === p ? "filled" : "default"}
              onClick={() => handlePhaseChange(p)}
              style={{ textTransform: "capitalize" }}
            >
              {p}
            </Button>
          ))}
        </Group>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {/* Attacker */}
        <Paper>
          <Stack gap="sm">
            <h3
              style={{
                fontWeight: 700,
                color: "var(--mantine-color-yellow-4)",
                textTransform: "uppercase",
                fontSize: "14px",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Attacker
            </h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.attackerUnitId}
              onChange={(value) => value && handleAttackerUnitChange(value)}
              data={UNIT_DATA}
            />
            <NumberInput
              label="Model Count"
              min={1}
              max={100}
              value={state.attackerCount}
              onChange={(val) =>
                onChange({
                  ...state,
                  attackerCount:
                    typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
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
            <AttackerContextSection
              idPrefix="attacker"
              context={state.attackerContext}
              flags={attackerContextFlags}
              color="yellow"
              onChange={(ctx) => onChange({ ...state, attackerContext: ctx })}
            />
          </Stack>
        </Paper>

        {/* Defender */}
        <Paper>
          <Stack gap="sm">
            <h3
              style={{
                fontWeight: 700,
                color: "var(--mantine-color-blue-4)",
                textTransform: "uppercase",
                fontSize: "14px",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Defender
            </h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.defenderUnitId}
              onChange={(value) => value && handleDefenderUnitChange(value)}
              data={UNIT_DATA}
            />
            <NumberInput
              label="Model Count"
              min={1}
              max={100}
              value={state.defenderCount}
              onChange={(val) =>
                onChange({
                  ...state,
                  defenderCount:
                    typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
            <Checkbox
              color="yellow"
              checked={state.defenderInCover}
              onChange={(e) =>
                onChange({
                  ...state,
                  defenderInCover: e.currentTarget.checked,
                })
              }
              label={
                <>
                  In Cover{" "}
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--mantine-color-dimmed)",
                    }}
                  >
                    (+1 to save)
                  </span>
                </>
              }
            />
            {state.phase === "melee" && (
              <>
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
                <AttackerContextSection
                  idPrefix="defender"
                  context={state.defenderContext}
                  flags={defenderContextFlags}
                  color="blue"
                  onChange={(ctx) =>
                    onChange({ ...state, defenderContext: ctx })
                  }
                />
              </>
            )}
          </Stack>
        </Paper>
      </div>

      {/* First fighter (melee only) */}
      {state.phase === "melee" && (
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
              color: "var(--mantine-color-gray-3)",
            }}
          >
            Who Fights First?
          </label>
          <Group gap="xs">
            {(["attacker", "defender"] as FirstFighter[]).map((f) => (
              <Button
                key={f}
                variant={state.firstFighter === f ? "filled" : "default"}
                onClick={() => onChange({ ...state, firstFighter: f })}
                style={{ textTransform: "capitalize" }}
              >
                {f}
              </Button>
            ))}
          </Group>
        </div>
      )}

      <Button
        fullWidth
        size="lg"
        color="green"
        onClick={onCalculate}
        style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        Calculate
      </Button>
    </Stack>
  );
}
