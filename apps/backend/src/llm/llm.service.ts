import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { llmConfig } from "./llm.config";

export type CreateMessageOptions = {
  model: string;
  maxTokens: number;
  system?: string;
  message: string;
};

@Injectable()
export class LlmService {
  constructor(
    @Inject(llmConfig.KEY)
    private readonly config: ConfigType<typeof llmConfig>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createMessage(options: CreateMessageOptions): Promise<string> {
    throw new Error("Not implemented");
  }
}
