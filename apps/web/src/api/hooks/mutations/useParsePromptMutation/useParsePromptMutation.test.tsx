import { renderHook, act, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useParsePromptMutation } from "./useParsePromptMutation";
import type { CombatFormState } from "@/features/calculator/types";

describe("useParsePromptMutation", () => {
  const mockState = { phase: "shooting" } as Partial<CombatFormState>;

  const server = setupServer(handlers.parsePrompt.success({ data: mockState }));

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return parsed state when mutation succeeds", async () => {
    const { result } = renderHook(() => useParsePromptMutation(), {
      wrapper: TestQueryClientProvider,
    });

    await act(async () => {
      await result.current.mutateAsync("10 intercessors shoot at ork boyz");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockState);
  });
});
