import type { CombatFormState } from "@/lib/calculator/types";

export const parsePrompt = async (prompt: string): Promise<CombatFormState> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/parse-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error("Failed to parse prompt");
  return response.json() as Promise<CombatFormState>;
};
