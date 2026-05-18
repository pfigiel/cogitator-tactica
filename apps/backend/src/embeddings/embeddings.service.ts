import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(embeddingsConfig.KEY)
    private readonly config: ConfigType<typeof embeddingsConfig>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  embedText(text: string): Promise<number[]> {
    throw new Error("Not implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  embedTexts(texts: string[]): Promise<number[][]> {
    throw new Error("Not implemented");
  }
}
