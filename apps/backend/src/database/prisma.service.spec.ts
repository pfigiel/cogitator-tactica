import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it("should be defined when injected", () => {
    expect(service).toBeDefined();
  });

  it("should call $connect when onModuleInit is called", async () => {
    const connectSpy = vi
      .spyOn(service, "$connect")
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledOnce();
  });

  it("should call $disconnect when onModuleDestroy is called", async () => {
    const disconnectSpy = vi
      .spyOn(service, "$disconnect")
      .mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});
