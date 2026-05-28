import "reflect-metadata";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import serverlessExpress from "@codegenie/serverless-express";
import { Callback, Context, Handler } from "aws-lambda";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./src/app.module";

// Prisma searches /tmp/prisma-engines as a built-in Lambda fallback.
// Copy the engine binary there from /var/task (read-only but executable).
const ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";
const engineSrc = join("/var/task/prisma-engines", ENGINE);
const engineDest = join("/tmp/prisma-engines", ENGINE);
if (existsSync(engineSrc) && !existsSync(engineDest)) {
  mkdirSync("/tmp/prisma-engines", { recursive: true });
  copyFileSync(engineSrc, engineDest);
}

let server: Handler;

const bootstrap = async (): Promise<Handler> => {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: /^https:\/\/cogitator-tactica[\w-]*\.vercel\.app$/,
  });
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
};

export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
