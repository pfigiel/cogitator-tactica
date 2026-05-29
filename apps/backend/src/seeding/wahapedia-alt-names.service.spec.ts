import { Test, TestingModule } from "@nestjs/testing";
import { DeepMockProxy } from "vitest-mock-extended";
import { WahapediaAltNamesService } from "./wahapedia-alt-names.service";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../database/prisma.service";
import { getMockProvider } from "../common/test/utils";
import { getMockDbUnit } from "../database/test/mocks";

describe("WahapediaAltNamesService", () => {
  let service: WahapediaAltNamesService;
  let llm: DeepMockProxy<LlmService>;
  let prisma: DeepMockProxy<PrismaService>;

  beforeAll(() => {
    vi.spyOn(console, "log").mockImplementation(vi.fn());
    vi.spyOn(console, "warn").mockImplementation(vi.fn());
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahapediaAltNamesService,
        getMockProvider(LlmService),
        getMockProvider(PrismaService),
      ],
    }).compile();

    service = module.get(WahapediaAltNamesService);
    llm = module.get(LlmService);
    prisma = module.get(PrismaService);
  });

  it("should call LlmService with faction name and update alt names in DB when generateAndUpdate is called", async () => {
    llm.createMessage.mockResolvedValue(
      '{"intercessors": ["Intercessor Squad"]}',
    );
    prisma.unit.update.mockResolvedValue(getMockDbUnit());

    await service.generateAndUpdate(
      new Map([["SM", [{ id: "intercessors", name: "Intercessors" }]]]),
      new Map([["SM", "Space Marines"]]),
    );

    expect(llm.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "haiku",
        maxTokens: 2048,
        message: expect.stringContaining("Space Marines"),
      }),
    );
    expect(prisma.unit.update).toHaveBeenCalledWith({
      where: { id: "intercessors" },
      data: { altNames: ["Intercessor Squad"] },
    });
  });

  it("should continue processing remaining factions when LLM call fails for one faction when generateAndUpdate is called", async () => {
    llm.createMessage
      .mockRejectedValueOnce(new Error("LLM error"))
      .mockResolvedValueOnce('{"orks_boy": ["Boyz"]}');
    prisma.unit.update.mockResolvedValue(getMockDbUnit());

    await service.generateAndUpdate(
      new Map([
        ["SM", [{ id: "intercessors", name: "Intercessors" }]],
        ["ORK", [{ id: "orks_boy", name: "Orks Boy" }]],
      ]),
      new Map([
        ["SM", "Space Marines"],
        ["ORK", "Orks"],
      ]),
    );

    expect(llm.createMessage).toHaveBeenCalledTimes(2);
    expect(prisma.unit.update).toHaveBeenCalledTimes(1);
    expect(prisma.unit.update).toHaveBeenCalledWith({
      where: { id: "orks_boy" },
      data: { altNames: ["Boyz"] },
    });
  });
});
