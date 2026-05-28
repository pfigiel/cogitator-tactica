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
      if (!outdir) {
        return {
          errors: [
            {
              text: "[copy-prisma-engine] outdir not set — cannot copy engine binary",
            },
          ],
        };
      }

      // Primary: resolve via @prisma/client package (deterministic in pnpm)
      const candidates = [];
      try {
        const clientPkg = require.resolve("@prisma/client/package.json");
        candidates.push(
          path.join(
            path.dirname(clientPkg),
            "..",
            "..",
            ".prisma",
            "client",
            ENGINE,
          ),
        );
      } catch (e) {
        console.error(e);
      }
      try {
        const prismaPkg = require.resolve("prisma/package.json");
        candidates.push(path.join(path.dirname(prismaPkg), ENGINE));
      } catch (e) {
        console.error(e);
      }

      // Fallback: find in repo root
      const repoRoot = path.resolve(__dirname, "../..");
      const found = execSync(
        `find "${repoRoot}" -name "${ENGINE}" -not -path "*/prisma-engines/*" 2>/dev/null`,
      )
        .toString()
        .trim()
        .split("\n")
        .filter(Boolean)[0];
      if (found) candidates.push(found);

      console.log(`[copy-prisma-engine] Searching for ${ENGINE}...`);
      console.log(
        `[copy-prisma-engine] Candidates: ${JSON.stringify(candidates)}`,
      );

      const engineSrc = candidates.find((c) => fsSync.existsSync(c));
      if (!engineSrc) {
        return {
          errors: [
            {
              text: `[copy-prisma-engine] ${ENGINE} not found in any of: ${candidates.join(", ")} — run prisma generate`,
            },
          ],
        };
      }

      const destDir = path.join(outdir, "prisma-engines");
      fsSync.mkdirSync(destDir, { recursive: true });
      fsSync.copyFileSync(engineSrc, path.join(destDir, ENGINE));
      console.log(`[copy-prisma-engine] Copied ${engineSrc} → ${destDir}`);
    });
  },
};

module.exports = [swcPlugin, copyPrismaEnginePlugin];
