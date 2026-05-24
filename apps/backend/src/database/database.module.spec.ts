import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "./database.module";
import { PrismaService } from "./prisma.service";

describe("DatabaseModule", () => {
  it("should export PrismaService when imported", async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    const service = module.get<PrismaService>(PrismaService);

    expect(service).toBeDefined();
  });
});
