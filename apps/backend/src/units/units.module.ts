import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { FactionsService } from "./factions.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

@Module({
  imports: [DatabaseModule],
  controllers: [UnitsController],
  providers: [UnitsService, FactionsService],
  exports: [UnitsService, FactionsService],
})
export class UnitsModule {}
