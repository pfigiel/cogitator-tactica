# Prisma on AWS Lambda

Prisma requires a native query engine binary (`.so.node`) at runtime. esbuild only bundles JavaScript, so the binary must be handled separately. This document describes the four changes required to make it work.

## 1. Generate the correct binary target (`prisma/schema.prisma`)

```prisma
generator client {
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

Lambda runs on RHEL-based Amazon Linux. `native` is needed for local development; `rhel-openssl-3.0.x` is the Lambda target.

## 2. Copy the binary into the build output (`esbuild-plugins.cjs`)

`copyPrismaEnginePlugin` runs after each esbuild build and copies the `.so.node` binary into `<outdir>/prisma-engines/`. serverless-esbuild packages everything under its build output directory into the Lambda zip, so the binary ends up at `/var/task/prisma-engines/<ENGINE>` inside Lambda.

The plugin resolves the binary path in order:

1. Via `require.resolve('@prisma/client/package.json')` → `../../.prisma/client/<ENGINE>`
2. Via `require.resolve('prisma/package.json')` → sibling `<ENGINE>`
3. Fallback: `find <repoRoot> -name <ENGINE>`

The build fails loudly (esbuild error) if the binary is not found, which prevents silent deployment of a broken package.

## 3. Copy binary to `/tmp` at Lambda cold start (`lambda.ts`)

`/var/task` is read-only in Lambda. Prisma 6.x hardcodes `/tmp/prisma-engines` as a fallback search path for Lambda. At module load time (before NestJS/Prisma initialise), the binary is copied:

```typescript
const ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";
const engineSrc = join("/var/task/prisma-engines", ENGINE);
const engineDest = join("/tmp/prisma-engines", ENGINE);
if (existsSync(engineSrc) && !existsSync(engineDest)) {
  mkdirSync("/tmp/prisma-engines", { recursive: true });
  copyFileSync(engineSrc, engineDest);
}
```

`PRISMA_QUERY_ENGINE_LIBRARY` is also set in `serverless.yml` as an additional hint, but the `/tmp` copy is the reliable path.

## 4. Run `prisma generate` in CI before deploy (`.github/workflows/deploy-backend.yml`)

```yaml
- name: Generate Prisma client
  working-directory: apps/backend
  run: pnpm exec prisma generate

- name: Verify Prisma engine binary
  working-directory: apps/backend
  run: |
    ENGINE="libquery_engine-rhel-openssl-3.0.x.so.node"
    COUNT=$(find ../.. -name "$ENGINE" 2>/dev/null | wc -l)
    if [ "$COUNT" -eq 0 ]; then
      echo "ERROR: $ENGINE not found — prisma generate may have failed"
      exit 1
    fi
    echo "Found $COUNT instance(s) of $ENGINE"
```

`prisma generate` must run on the CI runner before `serverless deploy` so that the `rhel-openssl-3.0.x` binary exists for the esbuild plugin to find. The verify step acts as a gate — if the binary is missing, the deploy fails before wasting time packaging and uploading.
