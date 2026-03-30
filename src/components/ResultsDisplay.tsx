"use client";

import { CombatResult, DirectionalResult } from "@/lib/calculator/types";

interface Props {
  result: CombatResult;
}

function DirectionTable({ result, title, color }: { result: DirectionalResult; title: string; color: string }) {
  return (
    <div className="space-y-2">
      <h3 className={`font-bold text-lg ${color}`}>{title}</h3>
      <p className="text-sm text-gray-400">
        {result.attackerName} → {result.defenderName}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-2 pr-4 text-gray-400 font-semibold">Step</th>
              <th className="text-right py-2 pr-4 text-gray-400 font-semibold">Input</th>
              <th className="text-right py-2 pr-4 text-gray-400 font-semibold">Average</th>
              <th className="text-left py-2 text-gray-400 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {result.steps.map((step, i) => (
              <tr key={i} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                <td className="py-2 pr-4 font-medium text-white">{step.label}</td>
                <td className="py-2 pr-4 text-right text-gray-300">{step.input.toFixed(2)}</td>
                <td className="py-2 pr-4 text-right font-bold text-amber-300">{step.average.toFixed(2)}</td>
                <td className="py-2 text-gray-400 text-xs">{step.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-6 pt-2 border-t border-gray-700">
        <div>
          <span className="text-xs text-gray-400 uppercase">Avg Damage</span>
          <div className="text-2xl font-bold text-amber-400">{result.averageDamage.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase">Avg Models Slain</span>
          <div className="text-2xl font-bold text-red-400">{result.averageModelsSlain.toFixed(2)}</div>
        </div>
      </div>
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
