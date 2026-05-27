export const getUnits = async (): Promise<
  Array<{ id: string; name: string }>
> => {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BACKEND_URL is not set");
  const response = await fetch(`${baseUrl}/units`);
  if (!response.ok) throw new Error("Failed to fetch units");
  return response.json() as Promise<Array<{ id: string; name: string }>>;
};
