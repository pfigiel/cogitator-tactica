"use client";

import {
  CombatFormState,
  Phase,
  FirstFighter,
} from "@/features/calculator/types";
import {
  Button,
  Select,
  NumberInput,
  Checkbox,
  Paper,
  Stack,
  Group,
} from "@cogitator-tactica/ui-kit";
import { IconCrosshair, IconShield, IconSword } from "@tabler/icons-react";
import { WeaponSelector } from "./components/WeaponSelector/WeaponSelector";
import {
  AttackerContextSection,
  relevantContextFlags,
} from "./components/AttackerContextSection/AttackerContextSection";
import styles from "./CombatForm.module.css";
import { useGetUnitsQuery } from "@/api/hooks/queries/useGetUnitsQuery";
import { useGetUnitQuery } from "@/api/hooks/queries/useGetUnitQuery";

type Props = {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
};

const CombatForm = ({ state, onChange, onCalculate }: Props) => {
  const { data: unitList = [] } = useGetUnitsQuery();
  const { data: attackerUnit } = useGetUnitQuery(state.attackerUnitId);
  const { data: defenderUnit } = useGetUnitQuery(state.defenderUnitId);

  const handlePhaseChange = (phase: Phase) => {
    const attackerPool = attackerUnit
      ? phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons
      : [];
    const defenderPool = defenderUnit ? defenderUnit.meleeWeapons : [];
    onChange({
      ...state,
      phase,
      attackerWeapons:
        attackerPool.length > 0 ? [{ weaponId: attackerPool[0].id }] : [],
      defenderWeapons:
        defenderPool.length > 0 ? [{ weaponId: defenderPool[0].id }] : [],
    });
  };

  const handleAttackerUnitChange = async (unitId: string) => {
    onChange({
      ...state,
      attackerUnitId: unitId,
    });
  };

  const handleDefenderUnitChange = async (unitId: string) => {
    onChange({
      ...state,
      defenderUnitId: unitId,
    });
  };

  const toggleAttackerWeapon = (weaponId: string) => {
    const isSelected = state.attackerWeapons.some(
      (w) => w.weaponId === weaponId,
    );
    if (isSelected) {
      onChange({
        ...state,
        attackerWeapons: state.attackerWeapons.filter(
          (w) => w.weaponId !== weaponId,
        ),
      });
    } else {
      onChange({
        ...state,
        attackerWeapons: [...state.attackerWeapons, { weaponId }],
      });
    }
  };

  const setAttackerWeaponCount = (weaponId: string, count: number) => {
    onChange({
      ...state,
      attackerWeapons: state.attackerWeapons.map((w) =>
        w.weaponId === weaponId ? { ...w, modelCount: count } : w,
      ),
    });
  };

  const moveAttackerWeaponUp = (weaponId: string) => {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  };

  const moveAttackerWeaponDown = (weaponId: string) => {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  };

  const toggleDefenderWeapon = (weaponId: string) => {
    const isSelected = state.defenderWeapons.some(
      (w) => w.weaponId === weaponId,
    );
    if (isSelected) {
      onChange({
        ...state,
        defenderWeapons: state.defenderWeapons.filter(
          (w) => w.weaponId !== weaponId,
        ),
      });
    } else {
      onChange({
        ...state,
        defenderWeapons: [...state.defenderWeapons, { weaponId }],
      });
    }
  };

  const setDefenderWeaponCount = (weaponId: string, count: number) => {
    onChange({
      ...state,
      defenderWeapons: state.defenderWeapons.map((w) =>
        w.weaponId === weaponId ? { ...w, modelCount: count } : w,
      ),
    });
  };

  const moveDefenderWeaponUp = (weaponId: string) => {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  };

  const moveDefenderWeaponDown = (weaponId: string) => {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponId === weaponId);
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  };

  const UNIT_DATA = unitList.map((u) => ({ value: u.id, label: u.name }));
  const attackerWeaponPool = attackerUnit
    ? state.phase === "shooting"
      ? attackerUnit.shootingWeapons
      : attackerUnit.meleeWeapons
    : [];
  const attackerContextFlags = relevantContextFlags(
    attackerWeaponPool,
    state.attackerWeapons,
  );
  const defenderContextFlags = relevantContextFlags(
    defenderUnit?.meleeWeapons ?? [],
    state.defenderWeapons,
  );

  return (
    <Stack gap="md">
      <Group gap="xs" justify="center" grow>
        <Button
          variant={state.phase === "shooting" ? "filled" : "default"}
          color={state.phase === "shooting" ? "yellow" : undefined}
          onClick={() => handlePhaseChange("shooting")}
          leftSection={<IconCrosshair size={16} />}
        >
          Shooting
        </Button>
        <Button
          variant={state.phase === "melee" ? "filled" : "default"}
          color={state.phase === "melee" ? "yellow" : undefined}
          onClick={() => handlePhaseChange("melee")}
          leftSection={<IconSword size={16} />}
        >
          Melee
        </Button>
      </Group>
      {state.phase === "melee" && (
        <Group gap="xs" justify="center" grow>
          {(["attacker", "defender"] as FirstFighter[]).map((f) => (
            <Button
              key={f}
              variant={state.firstFighter === f ? "filled" : "default"}
              color={state.firstFighter === f ? "yellow" : undefined}
              leftSection={
                f === "attacker" ? (
                  <IconSword size={16} />
                ) : (
                  <IconShield size={16} />
                )
              }
              onClick={() => onChange({ ...state, firstFighter: f })}
            >
              {f === "attacker"
                ? "Attacker fights first"
                : "Defender fights first"}
            </Button>
          ))}
        </Group>
      )}
      <div className={styles.grid}>
        <Paper>
          <Stack gap="sm">
            <h3 className={styles.attackerHeading}>Attacker</h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.attackerUnitId}
              onChange={(value) => {
                if (value)
                  void handleAttackerUnitChange(value).catch(console.error);
              }}
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
              onChange={(ctx) => onChange({ ...state, attackerContext: ctx })}
            />
          </Stack>
        </Paper>

        <Paper>
          <Stack gap="sm">
            <h3 className={styles.defenderHeading}>Defender</h3>
            <Select
              label="Unit"
              searchable
              minSearchLength={3}
              value={state.defenderUnitId}
              onChange={(value) => {
                if (value)
                  void handleDefenderUnitChange(value).catch(console.error);
              }}
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
                  <span className={styles.inCoverHint}>(+1 to save)</span>
                </>
              }
            />
            {state.phase === "melee" && (
              <>
                <WeaponSelector
                  weapons={defenderUnit?.meleeWeapons ?? []}
                  selected={state.defenderWeapons}
                  defaultModelCount={state.defenderCount}
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
                  onChange={(ctx) =>
                    onChange({ ...state, defenderContext: ctx })
                  }
                />
              </>
            )}
          </Stack>
        </Paper>
      </div>

      <Button fullWidth size="lg" color="yellow" onClick={onCalculate}>
        Engage Cogitator
      </Button>
    </Stack>
  );
};

export default CombatForm;
