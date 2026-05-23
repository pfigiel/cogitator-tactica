import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { llmConfig } from "./llm.config";
import { LlmService } from "./llm.service";

@Module({
  imports: [ConfigModule.forFeature(llmConfig)],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
