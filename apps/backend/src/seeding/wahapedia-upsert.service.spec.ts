import { Test, TestingModule } from "@nestjs/testing";
import { mockDeep, DeepMockProxy } from "vitest-mock-extended";
import { Prisma, type PrismaPromise } from "@prisma/client";
import { WahapediaUpsertService } from "./wahapedia-upsert.service";
import { PrismaService } from "../database/prisma.service";
import type { UnitWithFaction } from "./wahapedia-parser.service";

const makeBatchPayload = (count = 0): PrismaPromise<Prisma.BatchPayload> =>
  Promise.resolve({ count }) as unknown as PrismaPromise<Prisma.BatchPayload>;

const makeUnit = (overrides?: Partial<UnitWithFaction>): UnitWithFaction => ({
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

const makeWeapon = (id: string): UnitWithFaction["shootingWeapons"][0] => ({
  id,
  name: "Bolt Rifle",
  attacks: 2,
  skill: 3,
  strength: 4,
  ap: -1,
  damage: 1,
  abilities: [],
});

describe("WahapediaUpsertService", () => {
  let service: WahapediaUpsertService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();

    prisma.unitWeapon.deleteMany.mockResolvedValue({ count: 0 });
    prisma.unit.deleteMany.mockResolvedValue({ count: 0 });
    prisma.weapon.deleteMany.mockResolvedValue({ count: 0 });
    prisma.faction.deleteMany.mockResolvedValue({ count: 0 });
    prisma.faction.createMany.mockResolvedValue({ count: 0 });
    prisma.weapon.createMany.mockResolvedValue({ count: 0 });
    prisma.unit.createMany.mockResolvedValue({ count: 0 });
    prisma.unitWeapon.createMany.mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahapediaUpsertService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WahapediaUpsertService);
  });

  it("should delete all unit weapons, units, weapons, and factions when upsertAll is called", async () => {
    await service.upsertAll(
      [makeUnit()],
      [{ id: "SM", name: "Space Marines" }],
    );

    expect(prisma.unitWeapon.deleteMany).toHaveBeenCalledWith();
    expect(prisma.unit.deleteMany).toHaveBeenCalledWith();
    expect(prisma.weapon.deleteMany).toHaveBeenCalledWith();
    expect(prisma.faction.deleteMany).toHaveBeenCalledWith();
  });

  it("should prune in FK-safe order when upsertAll is called", async () => {
    const callOrder: string[] = [];
    prisma.unitWeapon.deleteMany.mockImplementation(() => {
      callOrder.push("unitWeapon");
      return makeBatchPayload();
    });
    prisma.unit.deleteMany.mockImplementation(() => {
      callOrder.push("unit");
      return makeBatchPayload();
    });
    prisma.weapon.deleteMany.mockImplementation(() => {
      callOrder.push("weapon");
      return makeBatchPayload();
    });
    prisma.faction.deleteMany.mockImplementation(() => {
      callOrder.push("faction");
      return makeBatchPayload();
    });

    await service.upsertAll(
      [makeUnit()],
      [{ id: "SM", name: "Space Marines" }],
    );

    expect(callOrder).toEqual(["unitWeapon", "unit", "weapon", "faction"]);
  });

  it("should insert factions, weapons, units, and unit weapons when upsertAll is called with a unit with weapons", async () => {
    const weapon = makeWeapon("bolt_rifle");
    const unit = makeUnit({ shootingWeapons: [weapon] });

    await service.upsertAll([unit], [{ id: "SM", name: "Space Marines" }]);

    expect(prisma.faction.createMany).toHaveBeenCalledWith({
      data: [{ id: "SM", name: "Space Marines" }],
    });
    expect(prisma.weapon.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: "bolt_rifle", name: "Bolt Rifle" })],
    });
    expect(prisma.unit.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ id: "intercessors", name: "Intercessors" }),
      ],
    });
    expect(prisma.unitWeapon.createMany).toHaveBeenCalledWith({
      data: [{ unitId: "intercessors", weaponId: "bolt_rifle" }],
    });
  });

  it("should skip unit weapon insert when upsertAll is called with a unit with no weapons", async () => {
    await service.upsertAll(
      [makeUnit()],
      [{ id: "SM", name: "Space Marines" }],
    );

    expect(prisma.unitWeapon.createMany).not.toHaveBeenCalled();
  });

  it("should log error and rethrow when prune fails", async () => {
    const error = new Error("DB error");
    prisma.unitWeapon.deleteMany.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      service.upsertAll([makeUnit()], [{ id: "SM", name: "Space Marines" }]),
    ).rejects.toThrow(error);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("FAILED at prune step"),
      error,
    );

    consoleSpy.mockRestore();
  });

  it("should log error and rethrow when faction insert fails", async () => {
    const error = new Error("DB error");
    prisma.faction.createMany.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      service.upsertAll([makeUnit()], [{ id: "SM", name: "Space Marines" }]),
    ).rejects.toThrow(error);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("FAILED at factions step"),
      error,
    );

    consoleSpy.mockRestore();
  });
});
