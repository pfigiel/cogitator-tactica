import { Injectable } from "@nestjs/common";
import type { DiceExpression } from "../common/types";
import { DICE_EXPRESSION_REGEX } from "../common/validators";

@Injectable()
export class RngService {
  dice(expr: DiceExpression): number {
    if (typeof expr === "number") return expr;

    const match = expr.match(DICE_EXPRESSION_REGEX);
    if (!match) throw new Error(`Invalid DiceExpression: "${expr}"`);

    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }

    return total + modifier;
  }
}
