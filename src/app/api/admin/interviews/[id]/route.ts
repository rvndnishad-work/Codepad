import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import { collectRecordingKeys, deleteRecordingKeys } from "@/lib/recording/objects-server";
import { logAdminAction } from "@/lib/admin/audit";

const patchSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "abandoned"]).optional(),
  regenerateShareToken: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await ensureAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status;
    if (parsed.data.status === "completed" || parsed.data.status === "abandoned") {
      data.finishedAt = new Date();
    }
  }
  if (parsed.data.regenerateShareToken) {
    data.shareToken = nanoid(24);
  }

  try {
    const before = await prisma.interviewSession.findUnique({ where: { id }, select: { title: true, status: true } });
    if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });
    const updated = await prisma.interviewSession.update({
      where: { id },
      data,
      select: { id: true, status: true, shareToken: true },
    });
    if (parsed.data.status !== undefined) {
      await logAdminAction({
        actor: guard.actor,
        action: "interview.status",
        targetType: "interview",
        targetId: id,
        targetLabel: before.title,
        before: { status: before.status },
        after: { status: updated.status },
        note: parsed.data.note ?? null,
      });
    }
    if (parsed.data.regenerateShareToken) {
      await logAdminAction({ actor: guard.actor, action: "interview.share_token.rotate", targetType: "interview", targetId: id, targetLabel: before.title, note: parsed.data.note ?? null });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
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
    const before = await prisma.interviewSession.findUnique({ where: { id }, select: { title: true, type: true, status: true, workspaceId: true } });
    if (!before) return NextResponse.json({ error: "not found" }, { status: 404 });
    const recordingKeys = await collectRecordingKeys({ interviewSessionIds: [id] });
    await prisma.interviewSession.delete({ where: { id } });
    await deleteRecordingKeys(recordingKeys);
    await logAdminAction({ actor: guard.actor, action: "interview.delete", targetType: "interview", targetId: id, targetLabel: before.title, before });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
