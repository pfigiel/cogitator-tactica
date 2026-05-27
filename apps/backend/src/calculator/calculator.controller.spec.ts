import { Test, TestingModule } from "@nestjs/testing";
import { MockProxy } from "vitest-mock-extended";
import { CalculatorController } from "./calculator.controller";
import { CalculatorService } from "./calculator.service";
import { getMockProvider } from "../common/test/utils";
import { getMockCombatInput, getMockCombatResult } from "./test/mocks";

describe("CalculatorController", () => {
  let controller: CalculatorController;
  let calculatorService: MockProxy<CalculatorService>;

  beforeEach(async () => {
    const calculatorProvider = getMockProvider(CalculatorService);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalculatorController],
      providers: [calculatorProvider],
    }).compile();

    controller = module.get<CalculatorController>(CalculatorController);
    calculatorService =
      module.get<MockProxy<CalculatorService>>(CalculatorService);
  });

  describe("calculate", () => {
    it("should return CombatResult when valid input is provided", async () => {
      const input = getMockCombatInput();
      const expected = getMockCombatResult();
      calculatorService.calculate.mockResolvedValue(expected);

      const result = await controller.calculate(input);

      expect(result).toEqual(expected);
      expect(calculatorService.calculate).toHaveBeenCalledWith(input);
    });

    it("should delegate to CalculatorService when called", async () => {
      const input = getMockCombatInput();
      calculatorService.calculate.mockResolvedValue(getMockCombatResult());

      await controller.calculate(input);

      expect(calculatorService.calculate).toHaveBeenCalledTimes(1);
    });
  });
});
