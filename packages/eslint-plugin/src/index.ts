import type { Linter } from "eslint";
import plugin from "./plugin";
import reactConfig from "./configs/react";

type Plugin = typeof plugin & { configs: { react: Linter.Config[] } };

const pluginWithConfigs: Plugin = {
  ...plugin,
  configs: {
    react: reactConfig,
  },
};

export = pluginWithConfigs;
