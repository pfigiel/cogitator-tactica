import { config } from "@/config/config.client";
import { http, HttpResponse } from "msw";

export const units = {
  getUnits: {
    success: (overrides?: { data?: Array<{ id: string; name: string }> }) =>
      http.get(`${config.backendUrl}/units`, () =>
        HttpResponse.json(overrides?.data ?? []),
      ),
    error: (overrides?: { status?: number }) =>
      http.get(
        `${config.backendUrl}/units`,
        () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
      ),
  },
  getUnit: {
    success: (overrides?: { id?: string; data?: object }) =>
      http.get(`${config.backendUrl}/units/:id`, ({ params }) =>
        HttpResponse.json(overrides?.data ?? { id: params.id, name: "Unit" }),
      ),
    error: (overrides?: { status?: number }) =>
      http.get(
        `${config.backendUrl}/units/:id`,
        () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
      ),
  },
};
