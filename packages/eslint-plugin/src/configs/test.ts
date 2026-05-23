import type { Linter } from "eslint";
import vitest from "@vitest/eslint-plugin";

const testConfig: Linter.Config[] = [
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: { vitest },
    rules: {
      "vitest/prefer-hooks-in-order": "error",
    },
  },
];

export default testConfig;
