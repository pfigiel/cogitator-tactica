import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";
import { PrismaService } from "../database/prisma.service";
import type { UnitWithFaction } from "./wahapedia-parser.service";

const makeUnit = (
  overrides: Partial<UnitWithFaction> = {},
): UnitWithFaction => ({
  id: "intercessors",
  name: "Intercessors",
  factionId: "SM",
  toughness: 4,
  save: 3,
  wounds: 2,
  keywords: ["INFANTRY"],
  shootingWeapons: [],
  meleeWeapons: [],
  ...overrides,
});

describe("WahapediaUpsertService", () => {
  let service: WahapediaUpsertService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahapediaUpsertService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(WahapediaUpsertService);
    prisma = module.get(PrismaService);
  });

  it("should call prisma.$transaction when upsertAll is called", async () => {
    prisma.$transaction.mockResolvedValue(undefined);

    await service.upsertAll(
      [makeUnit()],
      [{ id: "SM", name: "Space Marines" }],
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("should upsert factions, weapons, and units within transaction when upsertAll is called with a unit with a weapon", async () => {
    prisma.$transaction.mockImplementation(async (fn) =>
      (fn as (tx: typeof prisma) => Promise<void>)(prisma),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.faction.upsert.mockResolvedValue({} as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.weapon.upsert.mockResolvedValue({} as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.unit.upsert.mockResolvedValue({} as any);
    prisma.unitWeapon.deleteMany.mockResolvedValue({ count: 0 });
    prisma.unitWeapon.createMany.mockResolvedValue({ count: 1 });

    const unit = makeUnit({
      shootingWeapons: [
        {
          id: "bolt_rifle",
          name: "Bolt Rifle",
          attacks: 2,
          skill: 3,
          strength: 4,
          ap: 0,
          damage: 1,
          abilities: [],
        },
      ],
    });

    await service.upsertAll([unit], [{ id: "SM", name: "Space Marines" }]);

    expect(prisma.faction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "SM" } }),
    );
    expect(prisma.weapon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bolt_rifle" } }),
    );
    expect(prisma.unit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "intercessors" } }),
    );
    expect(prisma.unitWeapon.createMany).toHaveBeenCalledWith({
      data: [{ unitId: "intercessors", weaponId: "bolt_rifle" }],
    });
  });

  it("should delete unit weapons and skip createMany when upsertAll is called with a unit with no weapons", async () => {
    prisma.$transaction.mockImplementation(async (fn) =>
      (fn as (tx: typeof prisma) => Promise<void>)(prisma),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.faction.upsert.mockResolvedValue({} as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.unit.upsert.mockResolvedValue({} as any);
    prisma.unitWeapon.deleteMany.mockResolvedValue({ count: 0 });

    await service.upsertAll(
      [makeUnit()],
      [{ id: "SM", name: "Space Marines" }],
    );

    expect(prisma.unitWeapon.deleteMany).toHaveBeenCalledWith({
      where: { unitId: "intercessors" },
    });
    expect(prisma.unitWeapon.createMany).not.toHaveBeenCalled();
  });
});
