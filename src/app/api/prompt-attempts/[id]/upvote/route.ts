import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/prompt-attempts/[id]/upvote
 *
 * Idempotent toggle. Body: { upvoted: boolean }.
 * When the body's `upvoted` matches the current state for this user, the
 * server is a no-op and just returns the current count.
 *
 * The PromptAttempt.shareUpvotes column is the denormalised count used for
 * sort order; PromptUpvote rows are the source of truth.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required to upvote." }, { status: 401 });
  }

  const { id: attemptId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const targetState = body?.upvoted === true; // default to upvoting if missing

  const attempt = await prisma.promptAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      shared: true,
      userId: true,
      // IP-44: pull the scenario title so the notification body is meaningful.
      scenario: { select: { title: true } },
    },
  });
  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  if (!attempt.shared) {
    return NextResponse.json({ error: "This prompt isn't shared." }, { status: 400 });
  }
  if (attempt.userId === userId) {
    return NextResponse.json({ error: "You can't upvote your own prompt." }, { status: 400 });
  }

  // Tiny transaction so the count and the join row stay consistent.
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.promptUpvote.findUnique({
      where: { attemptId_userId: { attemptId, userId } },
    });

    if (targetState && !existing) {
      await tx.promptUpvote.create({ data: { attemptId, userId } });
      const updated = await tx.promptAttempt.update({
        where: { id: attemptId },
        data: { shareUpvotes: { increment: 1 } },
        select: { shareUpvotes: true },
      });
      return { upvoted: true, count: updated.shareUpvotes, didCreate: true };
    }
    if (!targetState && existing) {
      await tx.promptUpvote.delete({
        where: { attemptId_userId: { attemptId, userId } },
      });
      const updated = await tx.promptAttempt.update({
        where: { id: attemptId },
        data: { shareUpvotes: { decrement: 1 } },
        select: { shareUpvotes: true },
      });
      return { upvoted: false, count: updated.shareUpvotes };
    }
    // No state change — return current count
    const current = await tx.promptAttempt.findUnique({
      where: { id: attemptId },
      select: { shareUpvotes: true },
    });
    return { upvoted: targetState, count: current?.shareUpvotes ?? 0 };
  });

  // IP-44: fire PROMPT_UPVOTED only on the upvote-creation path (not on
  // un-upvote or no-op). Outside the transaction so a notification write
  // failure can't roll back the upvote count.
  if ((result as { didCreate?: boolean }).didCreate && attempt.userId) {
    const { notifyPromptUpvoted } = await import("@/lib/notifications/triggers");
    void notifyPromptUpvoted({
      attemptId: attempt.id,
      authorId: attempt.userId,
      upvoterId: userId,
      newCount: result.count,
      scenarioTitle: attempt.scenario?.title ?? null,
    });
  }

  return NextResponse.json({ ok: true, upvoted: result.upvoted, count: result.count });
}
