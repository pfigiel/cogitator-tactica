import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";
import { EmbeddingsService } from "./embeddings.service";

@Module({
  imports: [ConfigModule.forFeature(embeddingsConfig)],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
