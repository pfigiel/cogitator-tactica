import type { UnitProfile } from "@/lib/calculator/types";

export const getUnit = async (id: string): Promise<UnitProfile> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/units/${id}`);
  if (!response.ok) throw new Error("Failed to fetch unit");
  return response.json() as Promise<UnitProfile>;
};
