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

class AttackerContextDto {
  @IsBoolean()
  remainedStationary!: boolean;

  @IsBoolean()
  charged!: boolean;

  @IsBoolean()
  atHalfRange!: boolean;

  @IsBoolean()
  atLongRange!: boolean;
}

class DefenderContextDto {
  @IsBoolean()
  inCover!: boolean;
}

class WeaponProfileDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  attacks!: number | string;

  @IsInt()
  skill!: number;

  strength!: number | string;

  @IsInt()
  ap!: number;

  damage!: number | string;

  @IsArray()
  abilities!: object[];
}

class UnitProfileDto {
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
  keywords!: string[];

  @IsArray()
  shootingWeapons!: object[];

  @IsArray()
  meleeWeapons!: object[];
}

class SelectedWeaponInputDto {
  @ValidateNested()
  @Type(() => WeaponProfileDto)
  weapon!: WeaponProfileDto;

  @IsInt()
  @Min(1)
  modelCount!: number;
}

class CombatantInputDto {
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
  phase!: "shooting" | "melee";

  @ValidateNested()
  @Type(() => CombatantInputDto)
  attacker!: CombatantInputDto;

  @ValidateNested()
  @Type(() => CombatantInputDto)
  defender!: CombatantInputDto;

  @IsOptional()
  @IsIn(["attacker", "defender"])
  firstFighter?: "attacker" | "defender";
}
