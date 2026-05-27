// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useGetUnitQuery } from "./useGetUnitQuery";
import type { UnitProfile } from "@/lib/calculator/types";

const mockUnit: UnitProfile = {
  id: "unit-1",
  name: "Intercessors",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: [],
  shootingWeapons: [],
  meleeWeapons: [],
};

const server = setupServer(handlers.units.getUnit.success({ data: mockUnit }));

describe("useGetUnitQuery", () => {
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
