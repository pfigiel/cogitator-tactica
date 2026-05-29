import { renderHook, act, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useCalculateMutation } from "./useCalculateMutation";
import type { CombatInput, CombatResult } from "@/features/calculator/types";
import {
  getMockCombatInput,
  getMockCombatResult,
} from "@/api/endpoints/calculate/test/mocks";

describe("useCalculateMutation", () => {
  const mockInput: CombatInput = getMockCombatInput();
  const mockResult: Partial<CombatResult> = getMockCombatResult();

  const server = setupServer(handlers.calculate.success({ data: mockResult }));

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return combat result when mutation succeeds", async () => {
    const { result } = renderHook(() => useCalculateMutation(), {
      wrapper: TestQueryClientProvider,
    });

    await act(async () => {
      await result.current.mutateAsync(mockInput);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResult);
  });
});
