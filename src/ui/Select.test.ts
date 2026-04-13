import { describe, it, expect } from "vitest";
import { filterDataBySearchLength } from "./Select";

const DATA = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("filterDataBySearchLength", () => {
  it("returns empty array when query is shorter than threshold and nothing is selected", () => {
    expect(filterDataBySearchLength(DATA, "ab", 3, null)).toEqual([]);
  });

  it("returns only the selected item when query is shorter than threshold", () => {
    expect(filterDataBySearchLength(DATA, "ab", 3, "b")).toEqual([
      { value: "b", label: "Beta" },
    ]);
  });

  it("filters by label when query meets threshold", () => {
    expect(filterDataBySearchLength(DATA, "alp", 3, null)).toEqual([
      { value: "a", label: "Alpha" },
    ]);
  });

  it("filters by label when query exceeds threshold", () => {
    expect(filterDataBySearchLength(DATA, "alpha", 3, "a")).toEqual([
      { value: "a", label: "Alpha" },
    ]);
  });

  it("returns full data when minSearchLength is not set (undefined)", () => {
    expect(filterDataBySearchLength(DATA, "", undefined, null)).toEqual(DATA);
  });

  it("always includes the selected item even when query does not match its label", () => {
    expect(filterDataBySearchLength(DATA, "Alpha", 3, "b")).toEqual([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);
  });
});
