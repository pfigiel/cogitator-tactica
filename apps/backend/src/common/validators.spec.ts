import { validate } from "class-validator";
import { IsDiceExpression } from "./validators";

class TestDto {
  @IsDiceExpression()
  value: unknown;
}

describe("IsDiceExpression", () => {
  const validateValue = async (value: unknown): Promise<boolean> => {
    const dto = new TestDto();
    dto.value = value;
    const errors = await validate(dto);

    return errors.length === 0;
  };

  it("should pass when value is a positive integer", async () => {
    expect(await validateValue(3)).toBe(true);
  });

  it("should pass when value is a plain D6 expression", async () => {
    expect(await validateValue("D6")).toBe(true);
  });

  it("should pass when value is a plain D3 expression", async () => {
    expect(await validateValue("D3")).toBe(true);
  });

  it("should pass when value is a multi-dice expression", async () => {
    expect(await validateValue("2D6")).toBe(true);
  });

  it("should pass when value is a dice expression with positive modifier", async () => {
    expect(await validateValue("D6+1")).toBe(true);
  });

  it("should pass when value is a dice expression with negative modifier", async () => {
    expect(await validateValue("2D3-1")).toBe(true);
  });

  it("should pass when value is lowercase dice expression", async () => {
    expect(await validateValue("d6")).toBe(true);
  });

  it("should fail when value is a string that is not a dice expression", async () => {
    expect(await validateValue("hello")).toBe(false);
  });

  it("should fail when value uses an unsupported die size", async () => {
    expect(await validateValue("D4")).toBe(false);
  });

  it("should fail when value is zero", async () => {
    expect(await validateValue(0)).toBe(false);
  });

  it("should fail when value is a negative number", async () => {
    expect(await validateValue(-1)).toBe(false);
  });

  it("should fail when value is null", async () => {
    expect(await validateValue(null)).toBe(false);
  });

  it("should fail when value is undefined", async () => {
    expect(await validateValue(undefined)).toBe(false);
  });

  it("should fail when value is an object", async () => {
    expect(await validateValue({})).toBe(false);
  });
});
