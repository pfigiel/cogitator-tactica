import { DefenderContext, DEFAULT_DEFENDER_CONTEXT } from "@/lib/calculator/types";

describe("DefenderContext", () => {
  it("DEFAULT_DEFENDER_CONTEXT has inCover false", () => {
    expect(DEFAULT_DEFENDER_CONTEXT.inCover).toBe(false);
  });
});
