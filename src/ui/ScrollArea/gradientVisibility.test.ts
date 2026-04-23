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

  it("returns true when scrolled partway but not to bottom", () => {
    expect(shouldShowGradient(400, 200, 100)).toBe(true);
  });

  it("returns false when scrolled exactly to bottom", () => {
    // scrollTop(200) + clientHeight(200) = scrollHeight(400)
    expect(shouldShowGradient(400, 200, 200)).toBe(false);
  });

  it("returns false when within 8px threshold of bottom", () => {
    // scrollTop(193) + clientHeight(200) = 393, scrollHeight(400) - 8 = 392
    expect(shouldShowGradient(400, 200, 193)).toBe(false);
  });

  it("returns true when just outside the 8px threshold", () => {
    // scrollTop(191) + clientHeight(200) = 391 < scrollHeight(400) - 8(392), outside threshold
    expect(shouldShowGradient(400, 200, 191)).toBe(true);
  });

  it("returns false at exact 8px threshold boundary", () => {
    // scrollTop(192) + clientHeight(200) = 392 >= scrollHeight(400) - 8(392)
    expect(shouldShowGradient(400, 200, 192)).toBe(false);
  });
});
