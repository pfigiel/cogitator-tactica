import { getUnits } from "./endpoints/getUnits";
import { getUnit } from "./endpoints/getUnit";
import { parsePrompt } from "./endpoints/parsePrompt";
import { calculate } from "./endpoints/calculate";

export const api = {
  getUnits,
  getUnit,
  parsePrompt,
  calculate,
};
