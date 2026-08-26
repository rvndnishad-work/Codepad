import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";

/**
 * Candidate-side time extension ("+5 min" button).
 *
 * Enforces the recruiter's per-session policy atomically inside a transaction:
 *   - session not finished
 *   - extensionCount < maxExtensions (check + increment serialize together,
 *     so two concurrent clicks can't both slip through)
 *
 * Returns the authoritative new deadline so the client clock stays honest.
 */
export async function POST(req: NextRequest) {
  try {
    const { inviteToken } = (await req.json()) as { inviteToken?: string };
    if (!inviteToken) {
      return NextResponse.json({ error: "Missing inviteToken" }, { status: 400 });
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const session = await tx.aIInterviewSession.findUnique({
        where: { inviteToken },
        select: {
          id: true,
          finishedAt: true,
          startedAt: true,
          extensionCount: true,
          maxExtensions: true,
          extensionMinutes: true,
        },
      });
      if (!session) return { code: 404 as const, error: "Session not found" };
      if (session.finishedAt) return { code: 410 as const, error: "Interview already submitted" };
      if (!session.startedAt) {
        return { code: 409 as const, error: "Start the interview before extending time" };
      }
      if (session.extensionCount >= session.maxExtensions) {
        return { code: 409 as const, error: "No extensions remaining for this interview." };
      }

      const updated = await tx.aIInterviewSession.update({
        where: { id: session.id },
        data: {
          extensionCount: { increment: 1 },
          extraMinutes: { increment: session.extensionMinutes },
        },
        select: { extraMinutes: true, extensionCount: true, maxExtensions: true, startedAt: true },
      });

      // Recompute the authoritative deadline: startedAt + base budget + extras.
      // resolveSessionRounds handles both real rounds and legacy sessions
      // (which synthesize one 30-minute round).
      const full = await tx.aIInterviewSession.findUniqueOrThrow({
        where: { id: session.id },
        include: { rounds: true },
      });
      const totalBase =
        resolveSessionRounds(full).reduce((sum, r) => sum + r.estimatedMinutes, 0) || 30;

      const deadlineAt = new Date(
        (updated.startedAt ? new Date(updated.startedAt).getTime() : Date.now()) +
          (totalBase + updated.extraMinutes) * 60_000
      );

      return {
        deadlineAt: deadlineAt.toISOString(),
        extensionsRemaining: Math.max(0, updated.maxExtensions - updated.extensionCount),
        extraMinutes: updated.extraMinutes,
      };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.code });
    }

    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    console.error("[ai-extend] failed:", error);
    return NextResponse.json({ error: "Could not extend time" }, { status: 500 });
  }
}
