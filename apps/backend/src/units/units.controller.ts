import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { UnitsService } from "./units.service";
import type { UnitProfile } from "../common/types";

@Controller("units")
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  listUnits(): Promise<Array<{ id: string; name: string }>> {
    return this.unitsService.listUnits();
  }

  @Get(":id")
  async getUnit(@Param("id") id: string): Promise<UnitProfile> {
    const unit = await this.unitsService.getUnit(id);
    if (!unit) throw new NotFoundException();
    return unit;
  }
}
