import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type { CombatPhase, CombatSide } from "../common/types";

export class AttackerContextDto {
  @IsBoolean()
  remainedStationary!: boolean;

  @IsBoolean()
  charged!: boolean;

  @IsBoolean()
  atHalfRange!: boolean;

  @IsBoolean()
  atLongRange!: boolean;
}

export class DefenderContextDto {
  @IsBoolean()
  inCover!: boolean;
}

export class WeaponProfileDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  attacks!: number | string;

  @IsInt()
  skill!: number;

  strength!: number | string; // TODO: Add validation for dice expression

  @IsInt()
  ap!: number;

  damage!: number | string; // TODO: Add validation for dice expression

  @IsArray()
  abilities!: object[]; // TODO: Add stricter validation
}

export class UnitProfileDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  toughness!: number;

  @IsInt()
  @Min(2)
  save!: number;

  @IsOptional()
  @IsInt()
  invuln?: number;

  @IsInt()
  @Min(1)
  wounds!: number;

  @IsArray()
  keywords!: string[]; // TODO: Add stricter validation

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeaponProfileDto)
  shootingWeapons!: WeaponProfileDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeaponProfileDto)
  meleeWeapons!: WeaponProfileDto[];
}

export class SelectedWeaponInputDto {
  @ValidateNested()
  @Type(() => WeaponProfileDto)
  weapon!: WeaponProfileDto;

  @IsInt()
  @Min(1)
  modelCount!: number;
}

export class CombatantInputDto {
  @ValidateNested()
  @Type(() => UnitProfileDto)
  unit!: UnitProfileDto;

  @IsInt()
  @Min(1)
  modelCount!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttackerContextDto)
  attackerContext?: AttackerContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DefenderContextDto)
  defenderContext?: DefenderContextDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedWeaponInputDto)
  selectedWeapons!: SelectedWeaponInputDto[];
}

export class CalculateDto {
  @IsIn(["shooting", "melee"])
  phase!: CombatPhase;

  @ValidateNested()
  @Type(() => CombatantInputDto)
  attacker!: CombatantInputDto;

  @ValidateNested()
  @Type(() => CombatantInputDto)
  defender!: CombatantInputDto;

  @IsOptional()
  @IsIn(["attacker", "defender"])
  firstFighter?: CombatSide;
}
