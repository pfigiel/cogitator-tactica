"use client";

import { CombatResult, DirectionalResult, WeaponResult } from "@/lib/calculator/types";

interface Props {
  result: CombatResult;
}

function WeaponTable({ weaponResult }: { weaponResult: WeaponResult }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <h4 className="font-semibold text-white text-sm">{weaponResult.weaponName}</h4>
        <span className="text-xs text-gray-500">{weaponResult.modelCount} model(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-1.5 pr-4 text-gray-500 font-medium text-xs">Step</th>
              <th className="text-right py-1.5 pr-4 text-gray-500 font-medium text-xs">Input</th>
              <th className="text-right py-1.5 pr-4 text-gray-500 font-medium text-xs">Average</th>
            </tr>
          </thead>
          <tbody>
            {weaponResult.steps.map((step, i) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-800 transition-colors">
                <td className="py-1.5 pr-4 font-medium text-gray-300 text-xs">{step.label}</td>
                <td className="py-1.5 pr-4 text-right text-gray-400 text-xs">{step.input.toFixed(2)}</td>
                <td className="py-1.5 pr-4 text-right font-bold text-amber-300 text-xs">{step.average.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 pt-1 text-xs text-gray-400">
        <span>Damage: <span className="text-amber-400 font-bold">{weaponResult.averageDamage.toFixed(2)}</span></span>
        <span>Models Slain: <span className="text-red-400 font-bold">{weaponResult.averageModelsSlain.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

function DirectionTable({ result, title, color }: { result: DirectionalResult; title: string; color: string }) {
  const multiWeapon = result.weaponResults.length > 1;

  return (
    <div className="space-y-3">
      <h3 className={`font-bold text-lg ${color}`}>{title}</h3>
      <p className="text-sm text-gray-400">
        {result.attackerName} → {result.defenderName}
      </p>

      <div className="space-y-4">
        {result.weaponResults.map((wr) => (
          <WeaponTable key={wr.weaponName} weaponResult={wr} />
        ))}
      </div>

      {multiWeapon && (
        <div className="pt-2 border-t border-gray-600">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Combined totals</p>
          <div className="flex gap-6">
            <div>
              <span className="text-xs text-gray-400 uppercase">Avg Damage</span>
              <div className="text-2xl font-bold text-amber-400">{result.totalAverageDamage.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase">Avg Models Slain</span>
              <div className="text-2xl font-bold text-red-400">{result.totalAverageModelsSlain.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {!multiWeapon && (
        <div className="flex gap-6 pt-2 border-t border-gray-700">
          <div>
            <span className="text-xs text-gray-400 uppercase">Avg Damage</span>
            <div className="text-2xl font-bold text-amber-400">{result.totalAverageDamage.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase">Avg Models Slain</span>
            <div className="text-2xl font-bold text-red-400">{result.totalAverageModelsSlain.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsDisplay({ result }: Props) {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-white uppercase tracking-wide border-b border-gray-600 pb-2">
        Results — {result.phase === "shooting" ? "Shooting Phase" : "Fight Phase"}
      </h2>

      {result.firstFighterNote && (
        <div className="bg-yellow-900/40 border border-yellow-700 rounded p-3 text-yellow-200 text-sm">
          {result.firstFighterNote}
        </div>
      )}

      <DirectionTable
        result={result.primary}
        title={result.phase === "melee" ? "Primary Attack" : "Attack"}
        color="text-amber-400"
      />

      {result.counterattack && (
        <DirectionTable
          result={result.counterattack}
          title="Counterattack"
          color="text-blue-400"
        />
      )}
    </div>
  );
}
