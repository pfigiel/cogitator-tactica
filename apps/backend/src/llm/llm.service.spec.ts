import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { llmConfig } from "./llm.config";
import { LlmService } from "./llm.service";

const server = setupServer();

describe("LlmService", () => {
  let service: LlmService;

  beforeAll(() => server.listen());
  beforeEach(async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.ANTHROPIC_BASE_URL;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(llmConfig)],
      providers: [LlmService],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });
  afterEach(() => {
    server.resetHandlers();
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterAll(() => server.close());

  it("should return joined text when createMessage is called", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({
          content: [{ type: "text", text: "Hello, world!" }],
          stop_reason: "end_turn",
        }),
      ),
    );

    const result = await service.createMessage({
      model: "haiku",
      maxTokens: 256,
      message: "Say hello",
    });

    expect(result).toBe("Hello, world!");
  });

  it("should join multiple text blocks when createMessage returns multiple blocks", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({
          content: [
            { type: "text", text: "Part one. " },
            { type: "text", text: "Part two." },
          ],
          stop_reason: "end_turn",
        }),
      ),
    );

    const result = await service.createMessage({
      model: "haiku",
      maxTokens: 256,
      message: "Say something in two parts",
    });

    expect(result).toBe("Part one. Part two.");
  });

  it("should throw when createMessage is called with invalid API key", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json(
          {
            error: { type: "authentication_error", message: "Invalid API key" },
          },
          { status: 401 },
        ),
      ),
    );

    await expect(
      service.createMessage({
        model: "haiku",
        maxTokens: 256,
        message: "Say hello",
      }),
    ).rejects.toThrow();
  });

  it("should pass system prompt to API when createMessage is called with system param", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(
        "https://api.anthropic.com/v1/messages",
        async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            content: [{ type: "text", text: "Response" }],
            stop_reason: "end_turn",
          });
        },
      ),
    );

    await service.createMessage({
      model: "haiku",
      maxTokens: 128,
      system: "You are a helpful assistant.",
      message: "Say something",
    });

    expect(capturedBody).toMatchObject({
      system: "You are a helpful assistant.",
      messages: [{ role: "user", content: "Say something" }],
    });
  });

  it("should send system as array block with cache_control when cacheControl is true", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(
        "https://api.anthropic.com/v1/messages",
        async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            content: [{ type: "text", text: "Response" }],
            stop_reason: "end_turn",
          });
        },
      ),
    );

    await service.createMessage({
      model: "haiku",
      maxTokens: 128,
      system: "You are helpful.",
      cacheControl: true,
      message: "Hello",
    });

    expect(capturedBody).toMatchObject({
      system: [
        {
          type: "text",
          text: "You are helpful.",
          cache_control: { type: "ephemeral" },
        },
      ],
    });
  });
});
