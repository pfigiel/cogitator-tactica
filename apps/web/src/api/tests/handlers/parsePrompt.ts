import { http, HttpResponse } from "msw";
import type { CombatFormState } from "@/features/calculator/types";
import { config } from "@/config/config.client";

export const parsePrompt = {
  success: (overrides?: { data?: Partial<CombatFormState> }) =>
    http.post(`${config.backendUrl}/parse-prompt`, () =>
      HttpResponse.json(overrides?.data ?? {}),
    ),
  error: (overrides?: { status?: number }) =>
    http.post(
      `${config.backendUrl}/parse-prompt`,
      () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
    ),
};
