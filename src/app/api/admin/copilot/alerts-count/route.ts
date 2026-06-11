import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

/**
 * Tiny endpoint for the FloatingJarvisAgent badge poll. Previously the floating
 * widget asked the full Gemma route for a SELECT COUNT — that fanned out into
 * a paid LLM call every 30 seconds per admin tab. This trades it for a single
 * cheap `prisma.gemmaAlert.count` call.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.gemmaAlert.count({
    where: { status: "UNRESOLVED" },
  });

  return NextResponse.json({ count });
}
