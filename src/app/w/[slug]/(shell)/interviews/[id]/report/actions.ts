"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { appOrigin } from "@/lib/interview/links";
import { nudgeMissingScorecards } from "@/lib/interview/scorecard-server";
import { passMarkOf, storedPassMark } from "@/lib/interview/scorecard";
import type { DeliveryStatus } from "@/lib/interview/guests";

/**
 * Report actions for the interview scorecards: change the interview pass
 * mark (labels only) and nudge the interviewers who have not submitted.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function load(slug: string, id: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { error: "You are signed out." } as const;
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
  });
  const member = ws?.members[0];
  if (!ws || !member) return { error: "You are not a member of this workspace." } as const;
  const s = await prisma.interviewSession.findFirst({
    where: { id: String(id).slice(0, 40), workspaceId: ws.id, type: { not: "take-home" } },
    select: { id: true, userId: true, createdById: true, title: true, candidateName: true, scorecardPassMark: true },
  });
  if (!s) return { error: "This interview no longer exists." } as const;
  return { session, ws, member, s } as const;
}

/** Host or anyone who manages interviews sets the pass mark. It relabels the panel average only. */
export async function updateInterviewPassMarkAction(slug: string, id: string, value: number): Promise<Result<{ passMark: number }>> {
  try {
    const a = await load(slug, id);
    if ("error" in a) return { ok: false, error: a.error! };
    const { session, ws, member, s } = a;
    if (s.userId !== session.user!.id && !(await canMember(member, "interview:manage"))) {
      return { ok: false, error: "Only the host or someone who manages interviews can change the pass mark." };
    }
    const stored = storedPassMark(Number(value));
    await prisma.interviewSession.update({ where: { id: s.id }, data: { scorecardPassMark: stored } });
    void writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      actorUserId: session.user!.id,
      actorEmail: session.user!.email ?? null,
      action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_PASS_MARK_CHANGED,
      targetType: "interviewSession",
      targetId: s.id,
      meta: { title: s.title, candidateName: s.candidateName, from: passMarkOf(s.scorecardPassMark), to: passMarkOf(stored) },
    });
    revalidatePath(`/w/${slug}/interviews/${s.id}/report`);
    return { ok: true, passMark: passMarkOf(stored) };
  } catch (err) {
    console.error("[interviews] pass mark failed:", err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

/** Emails the interviewers who have not submitted. The host, whoever set it up, or anyone who runs interviews. */
export async function nudgeScorecardsAction(slug: string, id: string): Promise<Result<{ sent: DeliveryStatus[] }>> {
  try {
    const a = await load(slug, id);
    if ("error" in a) return { ok: false, error: a.error! };
    const { session, member, s } = a;
    const uid = session.user!.id!;
    if (s.userId !== uid && s.createdById !== uid && !(await canMember(member, "interview:conduct"))) {
      return { ok: false, error: "Only the host or someone who runs interviews can send reminders." };
    }
    const res = await nudgeMissingScorecards(
      s.id,
      { userId: uid, email: session.user!.email ?? null, name: session.user!.name ?? session.user!.email ?? "A teammate" },
      await appOrigin(),
    );
    revalidatePath(`/w/${slug}/interviews/${s.id}/report`);
    return res;
  } catch (err) {
    console.error("[interviews] nudge failed:", err);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}
