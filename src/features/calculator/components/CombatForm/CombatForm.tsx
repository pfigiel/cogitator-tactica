"use client";

import { CombatFormState, Phase, FirstFighter } from "@/lib/calculator/types";
import { UNIT_LIST, UNITS } from "@/data/units";
import {
  Button,
  Select,
  NumberInput,
  Checkbox,
  Paper,
  Stack,
  Group,
} from "@/ui";
import { WeaponSelector } from "./components/WeaponSelector/WeaponSelector";
import {
  AttackerContextSection,
  relevantContextFlags,
} from "./components/AttackerContextSection/AttackerContextSection";

interface Props {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
}

const UNIT_DATA = UNIT_LIST.map((u) => ({ value: u.id, label: u.name }));

const CombatForm = ({ state, onChange, onCalculate }: Props) => {
  const handlePhaseChange = (phase: Phase) => {
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
  };

  const handleAttackerUnitChange = (unitId: string) => {
    const unit = UNITS[unitId];
    const pool =
      state.phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
    onChange({
      ...state,
      attackerUnitId: unitId,
      attackerWeapons: pool.length > 0 ? [{ weaponName: pool[0].name }] : [],
    });
  };

  const handleDefenderUnitChange = (unitId: string) => {
    const unit = UNITS[unitId];
    onChange({
      ...state,
      defenderUnitId: unitId,
      defenderWeapons:
        unit.meleeWeapons.length > 0
          ? [{ weaponName: unit.meleeWeapons[0].name }]
          : [],
    });
  };

  const toggleAttackerWeapon = (weaponName: string) => {
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
  };

  const setAttackerWeaponCount = (weaponName: string, count: number) => {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.map((w) =>
        w.weaponName === weaponName ? { ...w, modelCount: count } : w
      ),
    });
  };

  const moveAttackerWeaponUp = (weaponName: string) => {
    const idx = state.attackerWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  };

  const moveAttackerWeaponDown = (weaponName: string) => {
    const idx = state.attackerWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  };

  const toggleDefenderWeapon = (weaponName: string) => {
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
  };

  const setDefenderWeaponCount = (weaponName: string, count: number) => {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.map((w) =>
        w.weaponName === weaponName ? { ...w, modelCount: count } : w
      ),
    });
  };

  const moveDefenderWeaponUp = (weaponName: string) => {
    const idx = state.defenderWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  };

  const moveDefenderWeaponDown = (weaponName: string) => {
    const idx = state.defenderWeapons.findIndex(
      (w) => w.weaponName === weaponName
    );
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  };

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
                  attackerCount: typeof val === "number" ? Math.max(1, val) : 1,
                })
              }
            />
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
                  defenderCount: typeof val === "number" ? Math.max(1, val) : 1,
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
                  weaponType="melee"
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
};

export default CombatForm;
