const API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3";

type EmbedResponse = {
  data: Array<{ embedding: number[]; index: number }>;
};

const embed = async (input: string[]): Promise<number[][]> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY ?? ""}`,
    },
    body: JSON.stringify({ input, model: MODEL }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as EmbedResponse;
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
};

export const embedText = async (text: string): Promise<number[]> => {
  const results = await embed([text]);
  return results[0];
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  return embed(texts);
};
