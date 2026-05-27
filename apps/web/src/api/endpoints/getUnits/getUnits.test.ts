import { setupServer } from "msw/node";
import { units } from "../../tests/handlers/units";
import { getUnits } from "./getUnits";

const server = setupServer(
  units.getUnits.success({ data: [{ id: "1", name: "Intercessors" }] }),
);

describe("getUnits", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("should return units list when response is ok", async () => {
    const result = await getUnits();
    expect(result).toEqual([{ id: "1", name: "Intercessors" }]);
  });

  it("should throw when response is not ok", async () => {
    server.use(units.getUnits.error());
    await expect(getUnits()).rejects.toThrow("Failed to fetch units");
  });
});
