import "server-only";
import { prisma } from "@/lib/prisma";
import { SCREENING_REVIEW_STAGES, TAKE_HOME_REVIEW_STAGES } from "./display";

/**
 * How many finished take-homes and AI screenings in a workspace still wait
 * for a decision (see `awaitsReview` for the rule).
 */
export async function countReviewQueue(workspaceId: string): Promise<number> {
  const takeHomeStage = { OR: [{ candidateId: null }, { candidate: { stage: { in: [...TAKE_HOME_REVIEW_STAGES] } } }] };
  const [legacy, sessions, screenings] = await Promise.all([
    prisma.takeHomeAssignment.count({ where: { workspaceId, status: "SUBMITTED", ...takeHomeStage } }),
    prisma.interviewSession.count({
      where: { workspaceId, type: "take-home", finishedAt: { not: null }, ...takeHomeStage },
    }),
    prisma.aIInterviewSession.count({
      where: {
        workspaceId,
        status: "COMPLETED",
        OR: [{ candidateId: null }, { candidate: { stage: { in: [...SCREENING_REVIEW_STAGES] } } }],
      },
    }),
  ]);
  return legacy + sessions + screenings;
}
