import { Body, Controller, Post } from "@nestjs/common";
import { CalculatorService } from "./calculator.service";
import { CalculateDto } from "./dtos";
import type { CombatInput, CombatResult } from "./types";

@Controller("calculate")
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Post()
  calculate(@Body() body: CalculateDto): Promise<CombatResult> {
    return this.calculatorService.calculate(body as unknown as CombatInput);
  }
}
