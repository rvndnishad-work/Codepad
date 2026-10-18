import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assistantCaller } from "@/lib/admin/assistant/route-auth";

/** Badge count for the floating assistant: unresolved alerts from the hourly scan. */
export async function GET() {
  const caller = await assistantCaller();
  if (caller instanceof NextResponse) return caller;
  const count = await prisma.gemmaAlert.count({ where: { status: "UNRESOLVED" } });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
