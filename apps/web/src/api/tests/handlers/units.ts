import { http, HttpResponse } from "msw";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export const units = {
  getUnits: {
    success: (overrides?: { data?: Array<{ id: string; name: string }> }) =>
      http.get(`${BASE}/units`, () => HttpResponse.json(overrides?.data ?? [])),
    error: (overrides?: { status?: number }) =>
      http.get(
        `${BASE}/units`,
        () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
      ),
  },
  getUnit: {
    success: (overrides?: { id?: string; data?: object }) =>
      http.get(`${BASE}/units/:id`, ({ params }) =>
        HttpResponse.json(overrides?.data ?? { id: params.id, name: "Unit" }),
      ),
    error: (overrides?: { status?: number }) =>
      http.get(
        `${BASE}/units/:id`,
        () => new HttpResponse(null, { status: overrides?.status ?? 500 }),
      ),
  },
};
