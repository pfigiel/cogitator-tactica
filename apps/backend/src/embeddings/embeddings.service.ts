import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";

const API_URL = "https://api.voyageai.com/v1/embeddings";

type EmbedResponse = {
  data: Array<{ embedding: number[]; index: number }>;
};

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(embeddingsConfig.KEY)
    private readonly config: ConfigType<typeof embeddingsConfig>,
  ) {}

  async embedText(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    return this.embed(texts);
  }

  private async embed(input: string[]): Promise<number[][]> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ input, model: this.config.model }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Voyage AI error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as EmbedResponse;
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
