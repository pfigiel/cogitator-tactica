"use client";

import { CombatFormState, Phase, FirstFighter } from "@/lib/calculator/types";
import { UNIT_LIST } from "@/data/units";

interface Props {
  state: CombatFormState;
  onChange: (state: CombatFormState) => void;
  onCalculate: () => void;
}

export default function CombatForm({ state, onChange, onCalculate }: Props) {
  function set<K extends keyof CombatFormState>(key: K, value: CombatFormState[K]) {
    onChange({ ...state, [key]: value });
  }

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
              onClick={() => set("phase", p)}
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
              onChange={(e) => set("attackerUnitId", e.target.value)}
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
              onChange={(e) => set("attackerCount", Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Defender */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-blue-400 uppercase text-sm tracking-wide">Defender</h3>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Unit</label>
            <select
              value={state.defenderUnitId}
              onChange={(e) => set("defenderUnitId", e.target.value)}
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
              onChange={(e) => set("defenderCount", Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cover"
              checked={state.defenderInCover}
              onChange={(e) => set("defenderInCover", e.target.checked)}
              className="accent-amber-500"
            />
            <label htmlFor="cover" className="text-sm text-gray-300">In Cover (+1 to save)</label>
          </div>
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
                onClick={() => set("firstFighter", f)}
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
