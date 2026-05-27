// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { handlers } from "@/api/tests/handlers";
import { TestQueryClientProvider } from "@/test/providers/TestQueryClientProvider";
import { useCalculateMutation } from "./useCalculateMutation";
import type { CombatInput, CombatResult } from "@/lib/calculator/types";

const mockInput: CombatInput = {
  phase: "shooting",
  attacker: {
    unit: {
      id: "u1",
      name: "A",
      toughness: 4,
      save: 3,
      wounds: 2,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 5,
    selectedWeapons: [],
  },
  defender: {
    unit: {
      id: "u2",
      name: "B",
      toughness: 4,
      save: 6,
      wounds: 1,
      keywords: [],
      shootingWeapons: [],
      meleeWeapons: [],
    },
    modelCount: 10,
    selectedWeapons: [],
  },
};

const mockResult: Partial<CombatResult> = {
  phase: "shooting",
  primary: {
    attackerName: "A (5)",
    defenderName: "B",
    weaponResults: [],
    totalAverageDamage: 3,
    totalAverageModelsSlain: 3,
  },
};

const server = setupServer(handlers.calculate.success({ data: mockResult }));

describe("useCalculateMutation", () => {
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
