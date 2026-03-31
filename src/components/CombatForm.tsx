"use client";

import { CombatFormState, Phase, FirstFighter, SelectedWeapon, WeaponProfile } from "@/lib/calculator/types";
import { UNIT_LIST, UNITS } from "@/data/units";

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
  accentColor,
  onToggle,
  onCountChange,
  onMoveUp,
  onMoveDown,
}: {
  weapons: WeaponProfile[];
  selected: SelectedWeapon[];
  defaultModelCount: number;
  accentColor: string;
  onToggle: (weaponName: string) => void;
  onCountChange: (weaponName: string, count: number) => void;
  onMoveUp: (weaponName: string) => void;
  onMoveDown: (weaponName: string) => void;
}) {
  if (weapons.length === 0) return null;

  // Render selected weapons in selection order, then unselected weapons
  const selectedWeapons = selected
    .map((s) => weapons.find((w) => w.name === s.weaponName))
    .filter((w): w is WeaponProfile => w !== undefined);
  const unselectedWeapons = weapons.filter((w) => !selected.some((s) => s.weaponName === w.name));
  const orderedWeapons = [...selectedWeapons, ...unselectedWeapons];

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-2">Weapons</label>
      <div className="space-y-2">
        {orderedWeapons.map((w) => {
          const selIdx = selected.findIndex((s) => s.weaponName === w.name);
          const isChecked = selIdx !== -1;
          const count = isChecked ? (selected[selIdx].modelCount ?? defaultModelCount) : defaultModelCount;
          const isFirst = selIdx === 0;
          const isLast = selIdx === selected.length - 1;

          return (
            <div key={w.name} className="flex items-center gap-2 flex-wrap">
              <input
                type="checkbox"
                id={`weapon-${w.name}`}
                checked={isChecked}
                onChange={() => onToggle(w.name)}
                className={`accent-${accentColor}-500 flex-shrink-0`}
              />
              <label
                htmlFor={`weapon-${w.name}`}
                className="text-sm text-gray-200 cursor-pointer flex-1 min-w-0"
              >
                {w.name}
                <span className="ml-2 text-xs text-gray-500">{weaponStats(w)}</span>
              </label>

              {isChecked && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">models:</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={count}
                      onChange={(e) =>
                        onCountChange(w.name, Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Up / Down reorder buttons — only shown when there are multiple selected weapons */}
                  {selected.length > 1 && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => onMoveUp(w.name)}
                        disabled={isFirst}
                        aria-label={`Move ${w.name} up`}
                        className="w-6 h-5 flex items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => onMoveDown(w.name)}
                        disabled={isLast}
                        aria-label={`Move ${w.name} down`}
                        className="w-6 h-5 flex items-center justify-center rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CombatForm({ state, onChange, onCalculate }: Props) {
  // ── Phase change ──────────────────────────────────────────────────────────
  function handlePhaseChange(phase: Phase) {
    const attackerUnit = UNITS[state.attackerUnitId];
    const defenderUnit = UNITS[state.defenderUnitId];
    const attackerPool = phase === "shooting" ? attackerUnit.shootingWeapons : attackerUnit.meleeWeapons;
    const defenderPool = defenderUnit.meleeWeapons;
    onChange({
      ...state,
      phase,
      attackerWeapons: attackerPool.length > 0 ? [{ weaponName: attackerPool[0].name }] : [],
      defenderWeapons: defenderPool.length > 0 ? [{ weaponName: defenderPool[0].name }] : [],
    });
  }

  // ── Attacker unit change ──────────────────────────────────────────────────
  function handleAttackerUnitChange(unitId: string) {
    const unit = UNITS[unitId];
    const pool = state.phase === "shooting" ? unit.shootingWeapons : unit.meleeWeapons;
    onChange({
      ...state,
      attackerUnitId: unitId,
      attackerWeapons: pool.length > 0 ? [{ weaponName: pool[0].name }] : [],
    });
  }

  // ── Defender unit change ──────────────────────────────────────────────────
  function handleDefenderUnitChange(unitId: string) {
    const unit = UNITS[unitId];
    onChange({
      ...state,
      defenderUnitId: unitId,
      defenderWeapons:
        unit.meleeWeapons.length > 0 ? [{ weaponName: unit.meleeWeapons[0].name }] : [],
    });
  }

  // ── Attacker weapon toggle ────────────────────────────────────────────────
  function toggleAttackerWeapon(weaponName: string) {
    const isSelected = state.attackerWeapons.some((w) => w.weaponName === weaponName);
    if (isSelected) {
      if (state.attackerWeapons.length <= 1) return; // keep at least one
      onChange({
        ...state,
        attackerWeapons: state.attackerWeapons.filter((w) => w.weaponName !== weaponName),
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
    const idx = state.attackerWeapons.findIndex((w) => w.weaponName === weaponName);
    if (idx <= 0) return;
    const next = [...state.attackerWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, attackerWeapons: next });
  }

  function moveAttackerWeaponDown(weaponName: string) {
    const idx = state.attackerWeapons.findIndex((w) => w.weaponName === weaponName);
    if (idx < 0 || idx >= state.attackerWeapons.length - 1) return;
    const next = [...state.attackerWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, attackerWeapons: next });
  }

  // ── Defender weapon toggle ────────────────────────────────────────────────
  function toggleDefenderWeapon(weaponName: string) {
    const isSelected = state.defenderWeapons.some((w) => w.weaponName === weaponName);
    if (isSelected) {
      if (state.defenderWeapons.length <= 1) return; // keep at least one
      onChange({
        ...state,
        defenderWeapons: state.defenderWeapons.filter((w) => w.weaponName !== weaponName),
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
    const idx = state.defenderWeapons.findIndex((w) => w.weaponName === weaponName);
    if (idx <= 0) return;
    const next = [...state.defenderWeapons];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange({ ...state, defenderWeapons: next });
  }

  function moveDefenderWeaponDown(weaponName: string) {
    const idx = state.defenderWeapons.findIndex((w) => w.weaponName === weaponName);
    if (idx < 0 || idx >= state.defenderWeapons.length - 1) return;
    const next = [...state.defenderWeapons];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange({ ...state, defenderWeapons: next });
  }

  const attackerUnit = UNITS[state.attackerUnitId];
  const defenderUnit = UNITS[state.defenderUnitId];
  const attackerWeaponPool =
    state.phase === "shooting" ? attackerUnit.shootingWeapons : attackerUnit.meleeWeapons;

  return (
    <div className="space-y-6">
      {/* Phase selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
          Phase
        </label>
        <div className="flex gap-3">
          {(["shooting", "melee"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePhaseChange(p)}
              className={`px-4 py-2 rounded font-semibold capitalize transition-colors ${
                state.phase === p
                  ? "bg-amber-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attacker */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-amber-400 uppercase text-sm tracking-wide">Attacker</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Unit</label>
            <select
              value={state.attackerUnitId}
              onChange={(e) => handleAttackerUnitChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              {UNIT_LIST.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Model Count</label>
            <input
              type="number"
              min={1}
              max={100}
              value={state.attackerCount}
              onChange={(e) =>
                onChange({ ...state, attackerCount: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <WeaponSelector
            weapons={attackerWeaponPool}
            selected={state.attackerWeapons}
            defaultModelCount={state.attackerCount}
            accentColor="amber"
            onToggle={toggleAttackerWeapon}
            onCountChange={setAttackerWeaponCount}
            onMoveUp={moveAttackerWeaponUp}
            onMoveDown={moveAttackerWeaponDown}
          />
        </div>

        {/* Defender */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-blue-400 uppercase text-sm tracking-wide">Defender</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Unit</label>
            <select
              value={state.defenderUnitId}
              onChange={(e) => handleDefenderUnitChange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            >
              {UNIT_LIST.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Model Count</label>
            <input
              type="number"
              min={1}
              max={100}
              value={state.defenderCount}
              onChange={(e) =>
                onChange({ ...state, defenderCount: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cover"
              checked={state.defenderInCover}
              onChange={(e) => onChange({ ...state, defenderInCover: e.target.checked })}
              className="accent-amber-500"
            />
            <label htmlFor="cover" className="text-sm text-gray-300">In Cover (+1 to save)</label>
          </div>
          {/* Defender weapon selection — only relevant for melee counterattack */}
          {state.phase === "melee" && (
            <WeaponSelector
              weapons={defenderUnit.meleeWeapons}
              selected={state.defenderWeapons}
              defaultModelCount={state.defenderCount}
              accentColor="blue"
              onToggle={toggleDefenderWeapon}
              onCountChange={setDefenderWeaponCount}
              onMoveUp={moveDefenderWeaponUp}
              onMoveDown={moveDefenderWeaponDown}
            />
          )}
        </div>
      </div>

      {/* First fighter (melee only) */}
      {state.phase === "melee" && (
        <div>
          <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">
            Who Fights First?
          </label>
          <div className="flex gap-3">
            {(["attacker", "defender"] as FirstFighter[]).map((f) => (
              <button
                key={f}
                onClick={() => onChange({ ...state, firstFighter: f })}
                className={`px-4 py-2 rounded font-semibold capitalize transition-colors ${
                  state.firstFighter === f
                    ? "bg-amber-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onCalculate}
        className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg text-lg transition-colors uppercase tracking-wide"
      >
        Calculate
      </button>
    </div>
  );
}
