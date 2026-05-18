import { registerAs } from "@nestjs/config";

export const embeddingsConfig = registerAs("embeddings", () => ({
  apiKey: process.env.VOYAGE_API_KEY ?? "",
  model: process.env.VOYAGE_MODEL ?? "voyage-3",
}));
