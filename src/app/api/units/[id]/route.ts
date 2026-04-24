import { NextRequest, NextResponse } from "next/server";
import { getUnit } from "@/lib/db/units";

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const unit = await getUnit(id);

  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  return NextResponse.json(unit);
};
