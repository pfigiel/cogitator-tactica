import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useGetUnitQuery } from "./useGetUnitQuery";
import { getMockUnitProfile } from "@/features/calculator/test/mocks";

describe("useGetUnitQuery", () => {
  const mockUnit = getMockUnitProfile();

  const server = setupServer(
    handlers.units.getUnit.success({ data: mockUnit }),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return unit profile when fetch succeeds", async () => {
    const { result } = renderHook(() => useGetUnitQuery("unit-1"), {
      wrapper: TestQueryClientProvider,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUnit);
  });

  it("should not fetch when id is empty", () => {
    const { result } = renderHook(() => useGetUnitQuery(""), {
      wrapper: TestQueryClientProvider,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
