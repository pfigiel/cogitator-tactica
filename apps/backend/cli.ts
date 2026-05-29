import { CommandFactory } from "nest-commander";
import { SeedingModule } from "./src/seeding/seeding.module";

const bootstrap = async () => {
  await CommandFactory.run(SeedingModule, { logger: ["warn", "error"] });
};

bootstrap();
