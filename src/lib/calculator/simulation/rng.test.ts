import { describe, it, expect } from "vitest";
import { standardRng } from "@/lib/calculator/simulation/rng";

describe("standardRng.d6", () => {
  it("returns an integer between 1 and 6 inclusive", () => {
    for (let i = 0; i < 200; i++) {
      const result = standardRng.d6();
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });
});

describe("standardRng.dice", () => {
  it("returns the number unchanged for a numeric expression", () => {
    expect(standardRng.dice(0)).toBe(0);
    expect(standardRng.dice(3)).toBe(3);
    expect(standardRng.dice(10)).toBe(10);
  });

  it("dice('D6') returns integer in [1, 6]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D6");
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });

  it("dice('D3') returns integer in [1, 3]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D3");
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(3);
    }
  });

  it("dice('2D6') returns integer in [2, 12]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("2D6");
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(12);
    }
  });

  it("dice('D6+1') returns integer in [2, 7]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D6+1");
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(7);
    }
  });

  it("dice('D3-1') returns integer in [0, 2]", () => {
    for (let i = 0; i < 200; i++) {
      const r = standardRng.dice("D3-1");
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(2);
    }
  });

  it("throws on an invalid dice expression", () => {
    expect(() => standardRng.dice("D8")).toThrow('Invalid DiceExpression: "D8"');
    expect(() => standardRng.dice("D10+1")).toThrow();
  });
});
