import { http, HttpResponse } from "msw";
import type { CombatResult } from "@/lib/calculator/types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export const calculate = {
  success: (overrides?: { data?: Partial<CombatResult> }) =>
    http.post(`${BASE}/calculate`, () =>
      HttpResponse.json(overrides?.data ?? {}),
    ),
  error: (overrides?: { status?: number }) =>
    http.post(
      `${BASE}/calculate`,
      () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
    ),
};
