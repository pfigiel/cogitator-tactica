import { Test, TestingModule } from "@nestjs/testing";
import { RngService } from "./rng.service";
import { DiceExpression } from "../common/types";

describe("RngService", () => {
  let service: RngService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RngService],
    }).compile();

    service = module.get<RngService>(RngService);
  });

  describe("dice", () => {
    it("should return number unchanged when given a numeric expression", () => {
      expect(service.dice(0)).toBe(0);
      expect(service.dice(3)).toBe(3);
      expect(service.dice(10)).toBe(10);
    });

    it("should return integer in [1, 6] when given 'D6'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D6");

        expect(Number.isInteger(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(6);
      }
    });

    it("should return integer in [1, 3] when given 'D3'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D3");

        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(3);
      }
    });

    it("should return integer in [2, 12] when given '2D6'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("2D6");

        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(12);
      }
    });

    it("should return integer in [2, 7] when given 'D6+1'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D6+1");

        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(7);
      }
    });

    it("should return integer in [0, 2] when given 'D3-1'", () => {
      for (let i = 0; i < 200; i++) {
        const r = service.dice("D3-1");

        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(2);
      }
    });

    it("should throw when given an invalid dice expression", () => {
      expect(() => service.dice("D8" as DiceExpression)).toThrow(
        'Invalid DiceExpression: "D8"',
      );
      expect(() => service.dice("D10+1" as DiceExpression)).toThrow();
    });
  });
});
