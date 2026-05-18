import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { embeddingsConfig } from "./embeddings.config";
import { EmbeddingsService } from "./embeddings.service";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("EmbeddingsService", () => {
  let service: EmbeddingsService;

  beforeEach(async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    process.env.VOYAGE_MODEL = "voyage-3";
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(embeddingsConfig)],
      providers: [EmbeddingsService],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  it("embedText returns first embedding", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
      }),
    });

    const result = await service.embedText("hello");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("embedTexts returns sorted embeddings", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { embedding: [0.4, 0.5], index: 1 },
          { embedding: [0.1, 0.2], index: 0 },
        ],
      }),
    });

    const result = await service.embedTexts(["first", "second"]);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.4, 0.5],
    ]);
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(service.embedText("hello")).rejects.toThrow(
      "Voyage AI error 401: Unauthorized",
    );
  });
});
