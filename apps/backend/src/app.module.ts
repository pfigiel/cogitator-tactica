import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { UnitsModule } from "./units/units.module";
import { ParsePromptModule } from "./parse-prompt/parse-prompt.module";
import { CalculatorModule } from "./calculator/calculator.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    UnitsModule,
    ParsePromptModule,
    CalculatorModule,
  ],
})
export class AppModule {}
