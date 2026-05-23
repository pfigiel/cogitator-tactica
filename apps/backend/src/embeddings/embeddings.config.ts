import { registerAs } from "@nestjs/config";

export const embeddingsConfig = registerAs("embeddings", () => ({
  apiKey: process.env.VOYAGE_API_KEY ?? "",
  apiUrl:
    process.env.VOYAGE_API_URL ?? "https://api.voyageai.com/v1/embeddings",
  model: process.env.VOYAGE_MODEL ?? "voyage-3",
}));
