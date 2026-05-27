import { http, HttpResponse } from "msw";
import type { CombatFormState } from "@/lib/calculator/types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export const parsePrompt = {
  success: (overrides?: { data?: Partial<CombatFormState> }) =>
    http.post(`${BASE}/parse-prompt`, () =>
      HttpResponse.json(overrides?.data ?? {}),
    ),
  error: (overrides?: { status?: number }) =>
    http.post(
      `${BASE}/parse-prompt`,
      () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
    ),
};
