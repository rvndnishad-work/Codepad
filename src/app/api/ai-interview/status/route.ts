import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";
import {
  creditCostForLevel,
  getWorkspaceCredits,
} from "@/lib/ai-interview/credits";
import { geminiApiKey, AI_INTERVIEW_GEMINI_MODEL } from "@/lib/ai-interview/gemini";

/**
 * Candidate-facing health probe for an AI screening session.
 *
 * The message route already returns rich errors, but they only surface AFTER
 * a failed turn. This endpoint lets the workspace render honest state up
 * front: whether the AI model is configured, whether the workspace can pay
 * for the session, and whether the deadline has already passed.
 *
 * Auth model = same as every other candidate endpoint: the invite token IS
 * the secret. No cookies required.
 */
export async function GET(req: NextRequest) {
  const inviteToken = req.nextUrl.searchParams.get("inviteToken")?.trim();
  if (!inviteToken) {
    return NextResponse.json({ error: "Missing inviteToken" }, { status: 400 });
  }

  const session = await prisma.aIInterviewSession.findUnique({
    where: { inviteToken },
    include: { rounds: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Deadline mirrors the message route exactly: startedAt + sum of round
  // budgets + candidate-granted extensions (+30s grace). A session that hasn't
  // started yet is never expired.
  const sessionRounds = resolveSessionRounds(session);
  const totalMinutes = sessionRounds.reduce((s, r) => s + (r.estimatedMinutes || 0), 0) || 30;
  const deadline = session.startedAt
    ? new Date(new Date(session.startedAt).getTime() + (totalMinutes + (session.extraMinutes ?? 0)) * 60_000 + 30_000)
    : null;
  const expired = !!deadline && Date.now() > deadline.getTime();

  // Practice sessions are always free — no credit gate to report.
  const finished = !!session.finishedAt;
  let credits: { required: number; balance: number; sufficient: boolean } | null = null;
  if (!session.practice && !finished) {
    const required = creditCostForLevel(session.engagementLevel);
    const balance = await getWorkspaceCredits(session.workspaceId);
    credits = { required, balance, sufficient: balance >= required };
  }

  return NextResponse.json({
    ai: {
      configured: !!geminiApiKey(),
      model: AI_INTERVIEW_GEMINI_MODEL,
    },
    credits,
    deadline: deadline ? deadline.toISOString() : null,
    expired,
    finished,
    engagementLevel: session.engagementLevel,
    // Time-extension policy + remaining uses for the candidate's "+5 min" button.
    extensions: {
      used: session.extensionCount,
      max: session.maxExtensions,
      minutesEach: session.extensionMinutes,
      remaining: Math.max(0, session.maxExtensions - session.extensionCount),
    },
  });
}
