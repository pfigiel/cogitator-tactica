import type { Linter } from "eslint";
import plugin from "./plugin";
import reactConfig from "./configs/react";
import testConfig from "./configs/test";

type Plugin = typeof plugin & {
  configs: { react: Linter.Config[]; test: Linter.Config[] };
};

const pluginWithConfigs: Plugin = {
  ...plugin,
  configs: {
    react: reactConfig,
    test: testConfig,
  },
};

export = pluginWithConfigs;
