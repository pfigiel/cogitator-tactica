import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useGetUnitsQuery } from "./useGetUnitsQuery";
import { getMockUnitProfile } from "@/features/calculator/test/mocks";

describe("useGetUnitsQuery", () => {
  const mockUnits = [getMockUnitProfile()];

  const server = setupServer(
    handlers.units.getUnits.success({ data: mockUnits }),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return units list when fetch succeeds", async () => {
    const { result } = renderHook(() => useGetUnitsQuery(), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUnits);
  });
});
