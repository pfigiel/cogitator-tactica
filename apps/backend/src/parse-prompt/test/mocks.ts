import type { ParsedContext } from "../types";

export const getMockParsedContext = (
  overrides: Partial<ParsedContext> = {},
): ParsedContext => ({
  attackerName: "Intercessors",
  defenderName: "Boyz",
  attackerCount: 5,
  defenderCount: 10,
  phase: "shooting",
  defenderInCover: false,
  firstFighter: "attacker",
  attackerWeaponHints: [],
  defenderWeaponHints: [],
  ...overrides,
});
