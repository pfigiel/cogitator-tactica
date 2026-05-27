import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import preferArrow from "eslint-plugin-prefer-arrow";
import plugin from "@cogitator-tactica/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "prefer-arrow": preferArrow },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "arrow-body-style": ["error", "as-needed"],
      "prefer-arrow/prefer-arrow-functions": [
        "error",
        {
          disallowPrototype: true,
          singleReturnOnly: false,
          classPropertiesAllowed: false,
        },
      ],
    },
  },
  ...plugin.configs.test,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
      "prefer-arrow/prefer-arrow-functions": "off",
    },
  },
);
