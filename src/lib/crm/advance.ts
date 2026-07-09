/**
 * Forward-only pipeline auto-transitions (IP-69).
 *
 * `advanceCandidateStage` is the single path through which workflow events
 * (take-home dispatched/submitted, AI screening completed, live interview
 * created) move a candidate through the pipeline. Policy, agreed with the
 * product owner:
 *
 *   - Forward only (`isForwardTransition`): events never demote a candidate,
 *     and a candidate a recruiter already moved ahead stays ahead.
 *   - Never auto-enters HIRED or REJECTED — terminal moves are human calls
 *     (REJECTED additionally requires a reason via updateCandidateStageAction).
 *   - Server-only module: keep it out of client bundles (stages.ts stays the
 *     client-safe home for the taxonomy).
 *
 * Best-effort like the notification triggers: a failure here logs with an
 * `[crmAdvance]` prefix but never breaks the workflow event that fired it.
 */
import { prisma } from "@/lib/prisma";
import {
  isForwardTransition,
  type PipelineStage,
} from "@/lib/crm/stages";
import {
  writeWorkspaceAuditEntry,
  WORKSPACE_AUDIT_ACTIONS,
} from "@/lib/workspace-audit";

/** Stages workflow events may auto-advance into. Terminal stages excluded. */
export type AutoAdvanceStage = Exclude<PipelineStage, "HIRED" | "REJECTED">;

export type AdvanceInput = {
  workspaceId: string;
  /** Locate the candidate by id, or by (workspaceId, email) when the caller
   *  only knows the email (e.g. grading routes). */
  candidateId?: string;
  email?: string;
  toStage: AutoAdvanceStage;
  /** Audit trail source, e.g. "auto:take-home-dispatch". */
  source: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
};

/**
 * Move a candidate forward to `toStage` if that is forward progress from
 * where they are now; no-op otherwise. Returns whether a move happened.
 */
export async function advanceCandidateStage(
  input: AdvanceInput,
): Promise<{ advanced: boolean }> {
  try {
    const candidate = input.candidateId
      ? await prisma.candidate.findFirst({
          where: { id: input.candidateId, workspaceId: input.workspaceId },
          select: { id: true, name: true, stage: true, status: true },
        })
      : input.email
        ? await prisma.candidate.findUnique({
            where: {
              workspaceId_email: {
                workspaceId: input.workspaceId,
                email: input.email.toLowerCase().trim(),
              },
            },
            select: { id: true, name: true, stage: true, status: true },
          })
        : null;

    if (!candidate) return { advanced: false };

    const from = candidate.stage as PipelineStage;
    if (!isForwardTransition(from, input.toStage)) return { advanced: false };

    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        stage: input.toStage,
        stageChangedAt: new Date(),
        // A candidate parked at a terminal disposition who re-enters the
        // active pipeline gets their legacy `status` reset so roster filters
        // (which key off status) agree with the board again.
        ...(candidate.status === "rejected" || candidate.status === "hired"
          ? { status: "active", rejectReason: null, rejectReasonNote: null }
          : {}),
      },
    });

    void writeWorkspaceAuditEntry({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: WORKSPACE_AUDIT_ACTIONS.PIPELINE_STAGE_CHANGED,
      targetType: "candidate",
      targetId: candidate.id,
      meta: {
        candidateName: candidate.name,
        fromStage: from,
        toStage: input.toStage,
        source: input.source,
      },
    });

    return { advanced: true };
  } catch (err) {
    console.error("[crmAdvance] failed:", err);
    return { advanced: false };
  }
}
