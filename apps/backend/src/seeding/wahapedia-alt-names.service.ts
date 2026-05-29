import { Injectable } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../database/prisma.service";

const CHUNK_SIZE = 30;
const MAX_CONCURRENT = 4;

const SYSTEM_PROMPT = `You are generating alternative names for Warhammer 40,000 units.
For each unit, generate up to 3 alternative names that players commonly use to refer to that unit.
Return ONLY a valid JSON object where each key is the unit ID and the value is a string array of alt names, or an empty array if no good alt name exists.

Guidelines:
1. Pluralize + drop "Squad"/"Team"/"Mob": "Intercessor Squad" → ["Intercessors"], "Devastator Squad" → ["Devastators"]
2. Shorten long compound names by dropping prepositions: "Assault Intercessors With Jump Packs" → ["Jump Intercessors", "Assault Intercessors"]
3. Add or remove faction qualifier: "Intercessor Squad" → ["Space Marine Intercessors"]
4. Named characters: use first name, last name, or common title ("Marneus Calgar" → ["Marneus", "Calgar"]). Return [] for single-word names with no natural shortening ("Azrael" → []).

Fewer alt names is fine when not all strategies apply. Do not invent names players would not recognise.`;

@Injectable()
export class WahapediaAltNamesService {
  constructor(
    private readonly llm: LlmService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAndUpdate(
    unitsByFaction: Map<string, { id: string; name: string }[]>,
    factionNameById: Map<string, string>,
  ): Promise<void> {
    for (const [factionId, factionUnits] of unitsByFaction) {
      const factionName = factionNameById.get(factionId) ?? factionId;
      console.log(
        `Generating alt names for ${factionName} (${factionUnits.length} units)...`,
      );

      const altNames = await this.generateForFaction(factionUnits, factionName);

      for (const { id, altNames: names } of altNames) {
        await this.prisma.unit.update({
          where: { id },
          data: { altNames: names },
        });
      }
    }
  }

  private async generateForFaction(
    units: { id: string; name: string }[],
    factionName: string,
  ): Promise<{ id: string; altNames: string[] }[]> {
    const chunks: { id: string; name: string }[][] = [];
    for (let i = 0; i < units.length; i += CHUNK_SIZE) {
      chunks.push(units.slice(i, i + CHUNK_SIZE));
    }

    const chunkResults: { [unitId: string]: string[] }[] = [];
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          try {
            const text = await this.llm.createMessage({
              model: "haiku",
              maxTokens: 2048,
              system: SYSTEM_PROMPT,
              message: `Faction: ${factionName}\n\n${JSON.stringify(chunk)}`,
            });
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error(`No JSON in LLM response: ${text}`);
            return JSON.parse(jsonMatch[0]) as { [unitId: string]: string[] };
          } catch (err) {
            console.warn(
              `[WARN] LLM call failed for chunk of ${chunk.length} units in faction ${factionName}: ${err}`,
            );
            return {} as { [unitId: string]: string[] };
          }
        }),
      );
      chunkResults.push(...batchResults);
    }

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
  }
}
