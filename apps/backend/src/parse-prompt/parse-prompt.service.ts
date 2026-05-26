import { Injectable } from "@nestjs/common";
import { ContextExtractionService } from "./context-extraction.service";
import { UnitResolutionService } from "./unit-resolution.service";
import { WeaponResolutionService } from "./weapon-resolution.service";
import type { CombatFormState, SelectedWeapon } from "../common/types";
import { DEFAULT_ATTACKER_CONTEXT } from "../common/types";

@Injectable()
export class ParsePromptService {
  constructor(
    private readonly contextExtractionService: ContextExtractionService,
    private readonly unitResolutionService: UnitResolutionService,
    private readonly weaponResolutionService: WeaponResolutionService,
  ) {}

  async parse(prompt: string): Promise<CombatFormState> {
    const ctx = await this.contextExtractionService.extract(prompt);
    const { attackerUnit, defenderUnit } =
      await this.unitResolutionService.resolve(ctx);

    const phase = ctx.phase;
    const defaultAttackerPool =
      phase === "shooting"
        ? attackerUnit.shootingWeapons
        : attackerUnit.meleeWeapons;
    const defaultDefenderPool = defenderUnit.meleeWeapons;

    let attackerWeapons: SelectedWeapon[] =
      defaultAttackerPool.length > 0
        ? [{ weaponId: defaultAttackerPool[0].id }]
        : [];
    let defenderWeapons: SelectedWeapon[] =
      defaultDefenderPool.length > 0
        ? [{ weaponId: defaultDefenderPool[0].id }]
        : [];

    if (
      ctx.attackerWeaponHints.length > 0 ||
      ctx.defenderWeaponHints.length > 0
    ) {
      const weaponResolution = await this.weaponResolutionService.resolve(
        ctx,
        attackerUnit,
        defenderUnit,
        phase,
      );
      attackerWeapons = weaponResolution.attackerWeapons;
      defenderWeapons = weaponResolution.defenderWeapons;
    }

    return {
      phase,
      attackerUnitId: attackerUnit.id,
      attackerCount: ctx.attackerCount,
      attackerWeapons,
      attackerContext: DEFAULT_ATTACKER_CONTEXT,
      defenderUnitId: defenderUnit.id,
      defenderCount: ctx.defenderCount,
      defenderInCover: ctx.defenderInCover,
      defenderWeapons,
      defenderContext: DEFAULT_ATTACKER_CONTEXT,
      firstFighter: ctx.firstFighter,
    };
  }
}
