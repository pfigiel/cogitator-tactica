import { VoyageAIClient } from "voyageai";

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY ?? "" });

const MODEL = "voyage-3";

export const embedText = async (text: string): Promise<number[]> => {
  const result = await client.embed({ input: [text], model: MODEL });
  return (result.data?.[0].embedding as number[]) || [];
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const result = await client.embed({ input: texts, model: MODEL });
  return (result.data || [])
    .sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0))
    .map((d: any) => d.embedding as number[]);
};
