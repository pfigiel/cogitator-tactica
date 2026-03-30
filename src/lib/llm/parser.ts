import Anthropic from "@anthropic-ai/sdk";
import { CombatFormState } from "@/lib/calculator/types";
import { UNIT_LIST } from "@/data/units";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const UNIT_DESCRIPTIONS = UNIT_LIST
  .map((u) => `- "${u.id}": ${u.name}`)
  .join("\n");

const SYSTEM_PROMPT = `You are a Warhammer 40,000 combat assistant. Parse a natural language combat description into structured JSON.

Available units:
${UNIT_DESCRIPTIONS}

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "phase": "shooting" | "melee",
  "attackerUnitId": string,
  "attackerCount": number,
  "defenderUnitId": string,
  "defenderCount": number,
  "defenderInCover": boolean,
  "firstFighter": "attacker" | "defender"
}

Rules:
- "phase" defaults to "shooting" if not specified
- "firstFighter" defaults to "attacker" if not specified or ambiguous
- "defenderInCover" is true only if cover is explicitly mentioned
- If a unit name is ambiguous, pick the closest match from the available list
- attackerCount and defenderCount must be positive integers`;

export async function parsePrompt(prompt: string): Promise<CombatFormState> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  let parsed: CombatFormState;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`LLM returned invalid JSON: ${text}`);
  }

  // Validate required fields
  if (!parsed.phase || !parsed.attackerUnitId || !parsed.defenderUnitId) {
    throw new Error(`LLM response missing required fields: ${text}`);
  }

  return {
    phase: parsed.phase ?? "shooting",
    attackerUnitId: parsed.attackerUnitId,
    attackerCount: Math.max(1, Number(parsed.attackerCount) || 1),
    defenderUnitId: parsed.defenderUnitId,
    defenderCount: Math.max(1, Number(parsed.defenderCount) || 1),
    defenderInCover: Boolean(parsed.defenderInCover),
    firstFighter: parsed.firstFighter ?? "attacker",
  };
}
