import { describe, it, expect } from "vitest";
import { shouldShowGradient } from "./gradientVisibility";

describe("shouldShowGradient", () => {
  it("returns false when content fits without scrolling", () => {
    expect(shouldShowGradient(200, 200, 0)).toBe(false);
  });

  it("returns false when content is shorter than viewport", () => {
    expect(shouldShowGradient(100, 200, 0)).toBe(false);
  });

  it("returns true when content overflows and user is at the top", () => {
    expect(shouldShowGradient(400, 200, 0)).toBe(true);
  });

  it("returns false when scrolled down any amount", () => {
    expect(shouldShowGradient(400, 200, 1)).toBe(false);
  });

  it("returns false when scrolled to bottom", () => {
    expect(shouldShowGradient(400, 200, 200)).toBe(false);
  });
});
