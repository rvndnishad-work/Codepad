import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "unauthorized" as const, status: 401 };
  }
  if (!(await staffCan(session, "platform:admin"))) {
    return { error: "forbidden" as const, status: 403 };
  }
  return { ok: true as const };
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await ensureAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    await prisma.challengeAttempt.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
