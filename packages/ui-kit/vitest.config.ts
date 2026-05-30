import { defineConfig, type Plugin } from "vitest/config";

const cssModulesMock: Plugin = {
  name: "css-modules-mock",
  transform: (_code, id) => {
    if (id.endsWith(".module.css")) {
      return "export default new Proxy({}, { get: (_, key) => key });";
    }
  },
};

export default defineConfig({
  plugins: [cssModulesMock],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
