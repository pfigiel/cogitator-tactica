const transform = require("@swc/core");
const fs = require("fs").promises;

const swcPlugin = {
  name: "swc",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const source = await fs.readFile(args.path, "utf8");
      const result = await transform.transform(source, {
        filename: args.path,
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2020",
        },
        module: { type: "commonjs" },
      });
      return { contents: result.code, loader: "js" };
    });
  },
};

module.exports = [swcPlugin];
