import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import preferArrow from "eslint-plugin-prefer-arrow";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  {
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
);
