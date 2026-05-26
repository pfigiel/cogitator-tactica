import { Module } from "@nestjs/common";
import { CalculatorController } from "./calculator.controller";
import { CalculatorService } from "./calculator.service";
import { SimulationService } from "./simulation.service";
import { RngService } from "./rng.service";

@Module({
  controllers: [CalculatorController],
  providers: [CalculatorService, SimulationService, RngService],
  exports: [CalculatorService],
})
export class CalculatorModule {}
