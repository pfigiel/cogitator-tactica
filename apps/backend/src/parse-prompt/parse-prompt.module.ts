import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { UnitsModule } from "../units/units.module";
import { ParsePromptController } from "./parse-prompt.controller";
import { ParsePromptService } from "./parse-prompt.service";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";

@Module({
  imports: [LlmModule, EmbeddingsModule, UnitsModule],
  controllers: [ParsePromptController],
  providers: [
    ParsePromptService,
    ContextExtractionService,
    UnitResolutionService,
    WeaponResolutionService,
  ],
})
export class ParsePromptModule {}
