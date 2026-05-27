const transform = require("@swc/core");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

const ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";

const copyPrismaEnginePlugin = {
  name: "copy-prisma-engine",
  setup(build) {
    build.onEnd(() => {
      const outfile = build.initialOptions.outfile;
      const outdir = outfile
        ? path.dirname(outfile)
        : build.initialOptions.outdir;
      if (!outdir) return;

      const found = execSync(
        `find ../.. -path "*/node_modules/.prisma/client/${ENGINE}" 2>/dev/null`,
      )
        .toString()
        .trim()
        .split("\n")
        .filter(Boolean)[0];

      if (!found) {
        console.error(
          `[copy-prisma-engine] Engine binary not found — run prisma generate`,
        );
        return;
      }

      const destDir = path.join(outdir, "prisma-engines");
      fsSync.mkdirSync(destDir, { recursive: true });
      fsSync.copyFileSync(found, path.join(destDir, ENGINE));
      console.log(`[copy-prisma-engine] Copied engine to ${destDir}`);
    });
  },
};

module.exports = [swcPlugin, copyPrismaEnginePlugin];
