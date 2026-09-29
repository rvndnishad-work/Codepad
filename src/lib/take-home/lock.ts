import "server-only";
import { prisma } from "@/lib/prisma";
import { parseIds, submissionBlock } from "./status";

/**
 * Submission lock for take-homes, shared by the grade and attempt routes.
 *
 * Before this, both routes attached a new attempt to whatever `sessionId`
 * the browser sent, so a candidate could resubmit after finishing (or after
 * the deadline, or to someone else's take-home) and replace the score the
 * recruiter saw. Returns the reason to refuse, or null to go ahead.
 */
export async function takeHomeSubmissionBlock(args: {
  sessionId: string;
  challengeId: string;
  token: string | null | undefined;
  userId: string;
}): Promise<string | null> {
  const s = await prisma.interviewSession.findUnique({
    where: { id: args.sessionId },
    select: {
      type: true,
      status: true,
      deadlineAt: true,
      challengeIds: true,
      candidateAccessToken: true,
      candidate: { select: { email: true } },
    },
  });
  if (!s) return "Unknown take-home.";
  // Live and mock interviews keep their own flow.
  if (s.type !== "take-home") return null;

  let owns = !!args.token && args.token === s.candidateAccessToken;
  if (!owns && s.candidate?.email) {
    const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { email: true } });
    owns = !!user?.email && user.email.toLowerCase() === s.candidate.email.toLowerCase();
  }

  const finished = await prisma.challengeAttempt.findMany({
    where: { sessionId: args.sessionId, status: { in: ["passed", "failed"] } },
    select: { challengeId: true },
  });

  return submissionBlock({
    status: s.status,
    deadlineAt: s.deadlineAt,
    challengeIds: parseIds(s.challengeIds),
    challengeId: args.challengeId,
    ownsSession: owns,
    answered: finished.some((a) => a.challengeId === args.challengeId),
    started: finished.length > 0,
  });
}

/** The same lock for a legacy single-challenge invite, keyed by its token. */
export async function assignmentSubmissionBlock(token: string): Promise<string | null> {
  const a = await prisma.takeHomeAssignment.findUnique({
    where: { token },
    select: { status: true, expiresAt: true },
  });
  if (!a) return null;
  if (a.status === "SUBMITTED") return "You already submitted this take-home.";
  if (a.status === "CANCELLED") return "This take-home was cancelled.";
  if (a.status === "EXPIRED" || (a.status === "PENDING" && a.expiresAt.getTime() < Date.now())) {
    return "The deadline for this take-home has passed.";
  }
  return null;
}
