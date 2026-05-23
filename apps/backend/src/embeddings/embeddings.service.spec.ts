import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { embeddingsConfig } from "./embeddings.config";
import { EmbeddingsService } from "./embeddings.service";

const server = setupServer();

describe("EmbeddingsService", () => {
  let service: EmbeddingsService;

  beforeAll(() => server.listen());

  beforeEach(async () => {
    process.env.VOYAGE_API_KEY = "test-key";
    process.env.VOYAGE_MODEL = "voyage-3";

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(embeddingsConfig)],
      providers: [EmbeddingsService],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  afterAll(() => server.close());

  it("should return first embedding when embedText is called", async () => {
    server.use(
      http.post("https://api.voyageai.com/v1/embeddings", () =>
        HttpResponse.json({
          data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
        }),
      ),
    );

    const result = await service.embedText("hello");

    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("should return sorted embeddings when embedTexts is called", async () => {
    server.use(
      http.post("https://api.voyageai.com/v1/embeddings", () =>
        HttpResponse.json({
          data: [
            { embedding: [0.4, 0.5], index: 1 },
            { embedding: [0.1, 0.2], index: 0 },
          ],
        }),
      ),
    );

    const result = await service.embedTexts(["first", "second"]);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.4, 0.5],
    ]);
  });

  it("should throw when response is not ok", async () => {
    server.use(
      http.post("https://api.voyageai.com/v1/embeddings", () =>
        HttpResponse.text("Unauthorized", { status: 401 }),
      ),
    );

    await expect(service.embedText("hello")).rejects.toThrow(
      "Voyage AI error 401: Unauthorized",
    );
  });
});
