import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { ParsePromptService } from "./parse-prompt.service";
import type { CombatFormState } from "../common/types";

@Controller("parse-prompt")
export class ParsePromptController {
  constructor(private readonly parsePromptService: ParsePromptService) {}

  @Post()
  parse(@Body() body: { prompt: string }): Promise<CombatFormState> {
    if (!body?.prompt || typeof body.prompt !== "string") {
      throw new BadRequestException("prompt is required and must be a string");
    }
    return this.parsePromptService.parse(body.prompt);
  }
}
