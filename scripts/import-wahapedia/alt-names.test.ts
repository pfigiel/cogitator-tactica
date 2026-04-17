import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { generateAltNames } from "./alt-names";

describe("generateAltNames", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns alt names keyed by unit id", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"intercessor_squad": ["Intercessors", "Space Marine Intercessors"], "azrael": []}',
        },
      ],
    });

    const result = await generateAltNames(
      [
        { id: "intercessor_squad", name: "Intercessor Squad" },
        { id: "azrael", name: "Azrael" },
      ],
      "Space Marines",
    );

    expect(result).toEqual([
      {
        id: "intercessor_squad",
        altNames: ["Intercessors", "Space Marine Intercessors"],
      },
      { id: "azrael", altNames: [] },
    ]);
  });

  it("fires one LLM call per 30-unit chunk in parallel", async () => {
    mockCreate.mockImplementation(
      ({ messages }: { messages: { role: string; content: string }[] }) => {
        const units: { id: string; name: string }[] = JSON.parse(
          messages[0].content.split("\n\n")[1],
        );
        const resultObj: Record<string, string[]> = {};
        for (const u of units) resultObj[u.id] = [`${u.name} alt`];
        return Promise.resolve({
          content: [{ type: "text", text: JSON.stringify(resultObj) }],
        });
      },
    );

    const units = Array.from({ length: 35 }, (_, i) => ({
      id: `unit_${i}`,
      name: `Unit ${i}`,
    }));

    const result = await generateAltNames(units, "Space Marines");

    expect(mockCreate).toHaveBeenCalledTimes(2); // chunk of 30 + chunk of 5
    expect(result).toHaveLength(35);
  });

  it("warns and omits units whose id is missing from LLM response", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"unit_1": ["Intercessors"]}' }],
    });

    const result = await generateAltNames(
      [
        { id: "unit_1", name: "Intercessor Squad" },
        { id: "unit_2", name: "Missing Unit" },
      ],
      "Space Marines",
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unit_2"));
    expect(result).toHaveLength(1);
    warnSpy.mockRestore();
  });
});
