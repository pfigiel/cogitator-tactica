import { VoyageAIClient } from "voyageai";

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY ?? "" });

const MODEL = "voyage-3";

export const embedText = async (text: string): Promise<number[]> => {
  const result = await client.embed({ input: [text], model: MODEL });
  const embedding = result.data?.[0]?.embedding;
  if (!embedding) throw new Error("Voyage AI returned no embedding");
  return embedding;
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const result = await client.embed({ input: texts, model: MODEL });
  const data = result.data ?? [];
  return data
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((d) => {
      if (!d.embedding)
        throw new Error("Voyage AI returned no embedding for item");
      return d.embedding;
    });
};
