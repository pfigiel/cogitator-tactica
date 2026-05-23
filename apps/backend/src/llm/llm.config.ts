import { registerAs } from "@nestjs/config";

export const llmConfig = registerAs("llm", () => ({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
}));
