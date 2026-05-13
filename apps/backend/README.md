# Backend

NestJS API deployed as an AWS Lambda function via Serverless Framework.

## Responsibilities

- HTTP API served via AWS API Gateway + Lambda
- Thin NestJS application shell (currently: health check endpoint)
- Serverless deployment to `eu-central-1`

## Structure

```
src/
  app.module.ts    # Root NestJS module
  health/          # Health check module and controller
lambda.ts          # Lambda handler (bootstraps NestJS, wraps with serverless-express)
main.ts            # Local dev entry point
serverless.yml     # Serverless Framework deployment config
```

## Scripts

| Command          | Description                      |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start local dev server (ts-node) |
| `pnpm build`     | Compile TypeScript to `dist/`    |
| `pnpm start`     | Start compiled production server |
| `pnpm test`      | Run tests (Jest)                 |
| `pnpm lint`      | Lint                             |
| `pnpm typecheck` | Type-check                       |
| `pnpm clean`     | Remove `dist/`                   |

## Deployment

Deployed via Serverless Framework using esbuild bundling:

```bash
pnpm serverless deploy
```

Runtime: Node.js 20, AWS region: `eu-central-1`.

All routes (`/` and `/{proxy+}`) are handled by a single Lambda function.
