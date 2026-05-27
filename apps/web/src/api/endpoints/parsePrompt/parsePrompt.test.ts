import { setupServer } from "msw/node";
import { parsePrompt as parsePromptHandler } from "../../tests/handlers/parsePrompt";
import { parsePrompt } from "./parsePrompt";
import type { CombatFormState } from "@/lib/calculator/types";

const mockState: Partial<CombatFormState> = {
  phase: "shooting",
  attackerUnitId: "unit-1",
  defenderUnitId: "unit-2",
};

const server = setupServer(parsePromptHandler.success({ data: mockState }));

describe("parsePrompt", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return parsed form state when response is ok", async () => {
    const result = await parsePrompt("10 intercessors shoot at ork boyz");
    expect(result).toEqual(mockState);
  });

  it("should throw when response is not ok", async () => {
    server.use(parsePromptHandler.error());
    await expect(parsePrompt("some prompt")).rejects.toThrow(
      "Failed to parse prompt",
    );
  });
});
