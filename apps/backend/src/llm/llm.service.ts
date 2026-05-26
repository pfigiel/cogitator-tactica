import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import { llmConfig } from "./llm.config";

type LlmModel = "haiku";

const MODEL_MAP: Record<LlmModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
};

export type CreateMessageParams = {
  model: LlmModel;
  maxTokens: number;
  system?: string;
  cacheControl?: boolean;
  message: string;
};

@Injectable()
export class LlmService {
  private readonly client: Anthropic;

  constructor(
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  async createMessage(params: CreateMessageParams): Promise<string> {
    const system =
      params.system && params.cacheControl
        ? [
            {
              type: "text" as const,
              text: params.system,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : params.system;

    const response = await this.client.messages.create({
      model: MODEL_MAP[params.model],
      max_tokens: params.maxTokens,
      system,
      messages: [{ role: "user", content: params.message }],
    });

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as Anthropic.TextBlock).text)
      .join("");
  }
}
