import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { gradeSessionById } from "@/lib/ai-interview/grade";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";

/**
 * Abandoned AI screening sweep.
 *
 * Before this cron, a candidate who started a screening and closed the tab
 * stayed "ACTIVE" on the recruiter dashboard FOREVER — grading only ran when
 * the candidate personally reopened the invite link (client-side deadline
 * auto-submit). This sweep makes completion a stored fact:
 *
 *   - ACTIVE + started + past its total round budget (+30s grace) → graded
 *     against the last-saved per-round code (saved on every chat turn) and
 *     marked COMPLETED, exactly as if the candidate had hit submit.
 *   - PENDING invites (never started) are untouched — an invite has no expiry
 *     by design.
 *   - Already-graded sessions are skipped by the grader's idempotency guard,
 *     so overlapping cron runs and a candidate submitting simultaneously are
 *     both safe.
 *
 * Recommended cadence: every 5 minutes. Auth: `X-Cron-Secret` or
 * `Authorization: Bearer` (assertCronAuth).
 */
export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
  const now = Date.now();

  // Candidates in flight: started, never finished, still ACTIVE.
  const candidates = await prisma.aIInterviewSession.findMany({
    where: { status: "ACTIVE", startedAt: { not: null }, finishedAt: null },
    include: { rounds: true },
    orderBy: { startedAt: "asc" },
    take: 50, // bound each sweep; the next run picks up the rest
  });

  const results: { sessionId: string; outcome: string; score?: number }[] = [];

  for (const session of candidates) {
    // Deadline mirrors the message route: startedAt + sum of round budgets
    // (+30s grace). resolveSessionRounds covers legacy single-template rows
    // (30-minute default).
    const rounds = resolveSessionRounds(session);
    const totalMinutes =
      rounds.reduce((s, r) => s + (r.estimatedMinutes || 0), 0) || 30;
    const deadlineMs =
      new Date(session.startedAt!).getTime() + totalMinutes * 60_000 + 30_000;

    if (now < deadlineMs) continue; // still within their time budget

    try {
      const outcome = await gradeSessionById({
        sessionId: session.id,
        origin,
      });
      if (outcome.ok) {
        results.push({
          sessionId: session.id,
          outcome: outcome.abandoned ? "graded_abandoned" : "graded",
          score: outcome.score,
        });
      } else {
        results.push({ sessionId: session.id, outcome: outcome.reason });
      }
    } catch (err) {
      console.error(`[ai-expiry] failed to grade session ${session.id}:`, err);
      results.push({ sessionId: session.id, outcome: "error" });
    }
  }

  return NextResponse.json({
    success: true,
    scanned: candidates.length,
    processed: results.length,
    results,
  });
}
