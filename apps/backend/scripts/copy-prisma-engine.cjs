const { execSync } = require("child_process");
const { mkdirSync, copyFileSync } = require("fs");

const ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";

const output = execSync(
  `find ../.. -path "*/node_modules/.prisma/client/${ENGINE}" 2>/dev/null`,
)
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean)[0];

if (!output) {
  console.error(
    `Prisma RHEL engine binary not found. Run prisma generate first.`,
  );
  process.exit(1);
}

mkdirSync("prisma-engines", { recursive: true });
copyFileSync(output, `prisma-engines/${ENGINE}`);
console.log(`Copied Prisma engine: ${output} → prisma-engines/${ENGINE}`);
