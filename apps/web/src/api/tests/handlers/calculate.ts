import { http, HttpResponse } from "msw";
import type { CombatResult } from "@/lib/calculator/types";
import { config } from "@/config/config.client";

export const calculate = {
  success: (overrides?: { data?: Partial<CombatResult> }) =>
    http.post(`${config.backendUrl}/calculate`, () =>
      HttpResponse.json(overrides?.data ?? {}),
    ),
  error: (overrides?: { status?: number }) =>
    http.post(
      `${config.backendUrl}/calculate`,
      () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
    ),
};
