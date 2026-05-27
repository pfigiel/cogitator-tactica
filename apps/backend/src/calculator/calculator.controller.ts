import { Body, Controller, Post } from "@nestjs/common";
import { CalculatorService } from "./calculator.service";
import {
  CalculateDto,
  CombatantInputDto,
  UnitProfileDto,
  WeaponProfileDto,
} from "./dtos";
import type { CombatInput, CombatResult, CombatantInput } from "./types";
import type {
  WeaponProfile,
  WeaponAbility,
  UnitProfile,
  DiceExpression,
} from "../common/types";

@Controller("calculate")
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Post()
  calculate(@Body() body: CalculateDto): Promise<CombatResult> {
    return this.calculatorService.calculate(this.mapToInput(body));
  }

  // TODO: Add runtime validation for dice expressions
  private mapWeapon(dto: WeaponProfileDto): WeaponProfile {
    return {
      id: dto.id,
      name: dto.name,
      attacks: dto.attacks as DiceExpression,
      skill: dto.skill,
      strength: dto.strength as DiceExpression,
      ap: dto.ap,
      damage: dto.damage as DiceExpression,
      abilities: dto.abilities as WeaponAbility[],
    };
  }

  private mapUnit(dto: UnitProfileDto): UnitProfile {
    return {
      id: dto.id,
      name: dto.name,
      toughness: dto.toughness,
      save: dto.save,
      invuln: dto.invuln,
      wounds: dto.wounds,
      keywords: dto.keywords,
      shootingWeapons: dto.shootingWeapons.map((w) => this.mapWeapon(w)),
      meleeWeapons: dto.meleeWeapons.map((w) => this.mapWeapon(w)),
    };
  }

  private mapCombatant(dto: CombatantInputDto): CombatantInput {
    return {
      unit: this.mapUnit(dto.unit),
      modelCount: dto.modelCount,
      attackerContext: dto.attackerContext,
      defenderContext: dto.defenderContext,
      selectedWeapons: dto.selectedWeapons.map((sw) => ({
        weapon: this.mapWeapon(sw.weapon),
        modelCount: sw.modelCount,
      })),
    };
  }

  private mapToInput(dto: CalculateDto): CombatInput {
    if (dto.phase === "shooting") {
      return {
        phase: "shooting",
        attacker: this.mapCombatant(dto.attacker),
        defender: this.mapCombatant(dto.defender),
      };
    }
    return {
      phase: "melee",
      attacker: this.mapCombatant(dto.attacker),
      defender: this.mapCombatant(dto.defender),
      firstFighter: dto.firstFighter!,
    };
  }
}
