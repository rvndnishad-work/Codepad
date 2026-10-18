"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { requireStaff } from "../content/_lib/guard";
import { fail, ok, type ActionResult } from "../content/_lib/result";

/** Delete one attempt (submitted code, results, replay). Needs a reason. */
export async function deleteAttempt(id: string, note: string): Promise<ActionResult> {
  const { actor } = await requireStaff("platform:admin");
  if (!note.trim()) return fail("Add a reason.");
  const a = await prisma.challengeAttempt.findUnique({
    where: { id },
    select: { userId: true, status: true, score: true, challenge: { select: { title: true } }, startedAt: true },
  });
  if (!a) return fail("Attempt not found.");
  await prisma.challengeAttempt.delete({ where: { id } });
  await logAdminAction({
    actor,
    action: "content.attempt.delete",
    targetType: "attempt",
    targetId: id,
    targetLabel: a.challenge.title,
    before: { userId: a.userId, status: a.status, score: a.score, startedAt: a.startedAt },
    note,
  });
  revalidatePath("/admin/attempts");
  return ok();
}
