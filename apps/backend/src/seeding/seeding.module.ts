import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LlmModule } from "../llm/llm.module";
import { UnitsModule } from "../units/units.module";
import { SeedCommand } from "./seed.command";
import { WahapediaAltNamesService } from "./wahapedia-alt-names.service";
import { WahapediaParserService } from "./wahapedia-parser.service";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";

@Module({
  imports: [DatabaseModule, LlmModule, UnitsModule],
  providers: [
    SeedCommand,
    WahapediaParserService,
    WahapediaUpsertService,
    WahapediaAltNamesService,
  ],
})
export class SeedingModule {}
