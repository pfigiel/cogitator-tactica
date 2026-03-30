"use client";

import { useState } from "react";
import { CombatFormState } from "@/lib/calculator/types";

interface Props {
  onParsed: (state: CombatFormState) => void;
}

export default function PromptInput({ onParsed }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      onParsed(data as CombatFormState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wide">
        Describe the combat situation
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder="e.g. 10 intercessors shoot at 20 ork boyz in cover"
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleParse}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
        >
          {loading ? "Parsing…" : "Parse"}
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-sm">Error: {error}</p>
      )}
      <p className="text-gray-500 text-xs">
        Powered by Claude Haiku — fills in the form below automatically.
      </p>
    </div>
  );
}
