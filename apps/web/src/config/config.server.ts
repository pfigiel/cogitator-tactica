import "server-only";
import { config as clientConfig } from "./config.client";

export const config = {
  ...clientConfig,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  voyageApiKey: process.env.VOYAGE_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
};
