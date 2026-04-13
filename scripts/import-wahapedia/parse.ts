import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "wahapedia-data");

// ─── Row types ────────────────────────────────────────────────────────────────

export type DatasheetRow = {
  id: string;
  name: string;
  faction_id: string;
};

export type ModelRow = {
  datasheet_id: string;
  line: string;
  name: string; // model variant name (e.g. "Sergeant"); may be same as unit name
  T: string;
  Sv: string;
  inv_sv: string;
  W: string;
};

export type WargearRow = {
  datasheet_id: string;
  line: string;
  name: string;
  description: string; // comma-separated ability tokens
  type: string; // "Ranged" | "Melee"
  A: string;
  BS_WS: string;
  S: string;
  AP: string;
  D: string;
};

export type KeywordRow = {
  datasheet_id: string;
  keyword: string;
};

// ─── CSV parser ───────────────────────────────────────────────────────────────

const parseCsv = (content: string): Record<string, string>[] => {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);
  return lines.slice(1).map((line) => {
    const values = line.split("|");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim()]),
    );
  });
};

const readCsv = async (filename: string): Promise<Record<string, string>[]> => {
  const content = await readFile(join(DATA_DIR, filename), "utf-8");
  return parseCsv(content);
};

// ─── Public API ───────────────────────────────────────────────────────────────

export type ParsedData = {
  datasheets: DatasheetRow[];
  models: ModelRow[];
  wargear: WargearRow[];
  keywords: KeywordRow[];
};

export const parseAll = async (): Promise<ParsedData> => {
  const [dsRaw, modRaw, wgRaw, kwRaw] = await Promise.all([
    readCsv("Datasheets.csv"),
    readCsv("Datasheets_models.csv"),
    readCsv("Datasheets_wargear.csv"),
    readCsv("Datasheets_keywords.csv"),
  ]);

  const datasheets: DatasheetRow[] = dsRaw.map((r) => ({
    id: r["id"],
    name: r["name"],
    faction_id: r["faction_id"],
  }));

  const models: ModelRow[] = modRaw.map((r) => ({
    datasheet_id: r["datasheet_id"],
    line: r["line"],
    name: r["name"],
    T: r["T"],
    Sv: r["Sv"],
    inv_sv: r["inv_sv"],
    W: r["W"],
  }));

  const wargear: WargearRow[] = wgRaw.map((r) => ({
    datasheet_id: r["datasheet_id"],
    line: r["line"],
    name: r["name"],
    description: r["description"],
    type: r["type"],
    A: r["A"],
    BS_WS: r["BS_WS"],
    S: r["S"],
    AP: r["AP"],
    D: r["D"],
  }));

  const keywords: KeywordRow[] = kwRaw.map((r) => ({
    datasheet_id: r["datasheet_id"],
    keyword: r["keyword"],
  }));

  return { datasheets, models, wargear, keywords };
};
