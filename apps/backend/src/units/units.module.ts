import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { FactionsService } from "./factions.service";
import { UnitEmbeddingsService } from "./unit-embeddings.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

@Module({
  imports: [DatabaseModule, EmbeddingsModule],
  controllers: [UnitsController],
  providers: [UnitsService, FactionsService, UnitEmbeddingsService],
  exports: [UnitsService, FactionsService, UnitEmbeddingsService],
})
export class UnitsModule {}
