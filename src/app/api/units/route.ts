import { NextResponse } from "next/server";
import { listUnits } from "@/lib/db/units";

export const GET = async () => {
  const units = await listUnits();
  return NextResponse.json(units);
};
