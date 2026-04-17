import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const CHUNK_SIZE = 30;

const SYSTEM_PROMPT = `You are generating alternative names for Warhammer 40,000 units.
For each unit, generate up to 3 alternative names that players commonly use to refer to that unit.
Return ONLY a valid JSON object where each key is the unit ID and the value is a string array of alt names, or an empty array if no good alt name exists.

Guidelines:
1. Pluralize + drop "Squad"/"Team"/"Mob": "Intercessor Squad" → ["Intercessors"], "Devastator Squad" → ["Devastators"]
2. Shorten long compound names by dropping prepositions: "Assault Intercessors With Jump Packs" → ["Jump Intercessors", "Assault Intercessors"]
3. Add or remove faction qualifier: "Intercessor Squad" → ["Space Marine Intercessors"]
4. Named characters: use first name, last name, or common title ("Marneus Calgar" → ["Marneus", "Calgar"]). Return [] for single-word names with no natural shortening ("Azrael" → []).

Fewer alt names is fine when not all strategies apply. Do not invent names players would not recognise.`;

const callLlm = async (
  chunk: { id: string; name: string }[],
  faction: string,
): Promise<{ [unitId: string]: string[] }> => {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Faction: ${faction}\n\n${JSON.stringify(chunk)}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in LLM response: ${text}`);
  return JSON.parse(jsonMatch[0]);
};

export const generateAltNames = async (
  units: { id: string; name: string }[],
  faction: string,
): Promise<{ id: string; altNames: string[] }[]> => {
  const chunks: { id: string; name: string }[][] = [];
  for (let i = 0; i < units.length; i += CHUNK_SIZE) {
    chunks.push(units.slice(i, i + CHUNK_SIZE));
  }

  const chunkResults = await Promise.all(
    chunks.map((chunk) => callLlm(chunk, faction)),
  );

  const merged: { [unitId: string]: string[] } = Object.assign(
    {},
    ...chunkResults,
  );

  return units
    .filter((unit) => {
      if (!(unit.id in merged)) {
        console.warn(
          `[WARN] Alt names not returned by LLM for unit: ${unit.id} (${unit.name})`,
        );
        return false;
      }
      return true;
    })
    .map((unit) => ({ id: unit.id, altNames: merged[unit.id] }));
};
