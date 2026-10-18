"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import { collectRecordingKeys, deleteRecordingKeys } from "@/lib/recording/objects-server";
import type { ActionResult } from "./_components/ConfirmAction";

async function actor() {
  const session = await requireAdminAccess();
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

function cleanNote(note: string): string | null {
  const n = (note ?? "").trim().slice(0, 500);
  return n.length ? n : null;
}

const STATUS_TARGETS = ["completed", "abandoned"] as const;

/** Force a session to completed or abandoned. Note required, audit logged. */
export async function setInterviewStatusAction(id: string, status: string, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = cleanNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };
  if (!(STATUS_TARGETS as readonly string[]).includes(status)) return { ok: false, error: "That status cannot be set from here." };
  const before = await prisma.interviewSession.findUnique({ where: { id }, select: { id: true, title: true, status: true, finishedAt: true } });
  if (!before) return { ok: false, error: "That interview no longer exists." };
  if (before.status === status) return { ok: false, error: "It already has that status." };
  const finishedAt = before.finishedAt ?? new Date();
  await prisma.interviewSession.update({ where: { id }, data: { status, finishedAt } });
  await logAdminAction({
    actor: who,
    action: "interview.status",
    targetType: "interview",
    targetId: id,
    targetLabel: before.title,
    before: { status: before.status },
    after: { status },
    note: n,
  });
  revalidatePath(`/admin/interviews/${id}`);
  revalidatePath("/admin/interviews");
  return { ok: true, message: `Marked ${status}.` };
}

/** New interviewer share link; the old one stops working. */
export async function rotateShareTokenAction(id: string, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = cleanNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };
  const s = await prisma.interviewSession.findUnique({ where: { id }, select: { title: true } });
  if (!s) return { ok: false, error: "That interview no longer exists." };
  await prisma.interviewSession.update({ where: { id }, data: { shareToken: nanoid(24) } });
  await logAdminAction({ actor: who, action: "interview.share_token.rotate", targetType: "interview", targetId: id, targetLabel: s.title, note: n });
  revalidatePath(`/admin/interviews/${id}`);
  return { ok: true, message: "New share link made. The old one no longer works." };
}

/** Delete the session, its scorecards, guests and recordings (objects too). */
export async function deleteInterviewAction(id: string, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = cleanNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };
  const s = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      title: true,
      type: true,
      status: true,
      workspaceId: true,
      candidateName: true,
      user: { select: { email: true } },
      _count: { select: { recordings: true, scorecards: true } },
    },
  });
  if (!s) return { ok: false, error: "That interview no longer exists." };
  const keys = await collectRecordingKeys({ interviewSessionIds: [id] });
  await prisma.interviewSession.delete({ where: { id } });
  await deleteRecordingKeys(keys);
  await logAdminAction({
    actor: who,
    action: "interview.delete",
    targetType: "interview",
    targetId: id,
    targetLabel: s.title,
    before: {
      type: s.type,
      status: s.status,
      workspaceId: s.workspaceId,
      candidateName: s.candidateName,
      host: s.user.email,
      recordings: s._count.recordings,
      scorecards: s._count.scorecards,
    },
    note: n,
  });
  revalidatePath("/admin/interviews");
  return { ok: true, message: "Deleted.", redirectTo: "/admin/interviews" };
}
