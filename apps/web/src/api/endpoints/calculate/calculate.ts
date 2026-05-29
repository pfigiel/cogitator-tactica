import type { CombatInput, CombatResult } from "@/features/calculator/types";

export const calculate = async (input: CombatInput): Promise<CombatResult> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to calculate");
  return response.json() as Promise<CombatResult>;
};
