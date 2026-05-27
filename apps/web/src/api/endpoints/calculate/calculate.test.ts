import { setupServer } from "msw/node";
import { calculate as calculateHandler } from "../../tests/handlers/calculate";
import { calculate } from "./calculate";
import { getMockCombatInput, getMockCombatResult } from "./test/mocks";

describe("calculate", () => {
  const mockInput = getMockCombatInput();
  const mockResult = getMockCombatResult();

  const server = setupServer(calculateHandler.success({ data: mockResult }));

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return combat result when response is ok", async () => {
    const result = await calculate(mockInput);

    expect(result).toEqual(mockResult);
  });

  it("should throw when response is not ok", async () => {
    server.use(calculateHandler.error());

    await expect(calculate(mockInput)).rejects.toThrow("Failed to calculate");
  });
});
