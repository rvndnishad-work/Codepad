import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "unauthorized" as const, status: 401 };
  }
  if (!(await staffCan(session, "platform:admin"))) {
    return { error: "forbidden" as const, status: 403 };
  }
  return { ok: true as const, actor: { id: session.user.id, email: session.user.email ?? null } };
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
    const gone = await prisma.challengeAttempt.delete({
      where: { id },
      select: { userId: true, status: true, challenge: { select: { title: true } } },
    });
    await logAdminAction({
      actor: guard.actor,
      action: "content.attempt.delete",
      targetType: "attempt",
      targetId: id,
      targetLabel: gone.challenge.title,
      before: { userId: gone.userId, status: gone.status },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
