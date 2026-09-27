/**
 * Stage semantics for MCP write tools.
 *
 * Candidates move through New, Screening, Passed and Not passed. An API key
 * may move someone between New, Screening and Not passed, but it never passes
 * anyone and never undoes a recruiter's pass: both are decisions a person
 * makes in the app. Pure so the rule can be unit tested without a server.
 */
import { REJECT_REASON_CHOICES, normalizeStage, type PipelineStage, type RejectReason } from "@/lib/crm/stages";

/** Stage names as MCP clients send them. */
export const MCP_STAGES = ["new", "screening", "passed", "not_passed"] as const;
export type McpStage = (typeof MCP_STAGES)[number];

/** Legacy status values the tool still accepts. */
export const MCP_LEGACY_STATUSES = ["active", "passed", "hired", "rejected", "archived"] as const;
export type McpLegacyStatus = (typeof MCP_LEGACY_STATUSES)[number];

export const MCP_REJECT_REASONS = REJECT_REASON_CHOICES;

const TO_PIPELINE: Record<McpStage, PipelineStage> = {
  new: "NEW",
  screening: "SCREENING",
  passed: "PASSED",
  not_passed: "REJECTED",
};

export const FROM_PIPELINE: Record<PipelineStage, McpStage> = {
  NEW: "new",
  SCREENING: "screening",
  PASSED: "passed",
  REJECTED: "not_passed",
};

export const PASS_REFUSAL = "Passing a candidate is a recruiter decision. Open the candidate in the app to pass them.";
export const UNPASS_REFUSAL =
  "This candidate was passed by a recruiter. Only a recruiter can change that, in the app.";

export type StageRequest = { stage?: McpStage; status?: McpLegacyStatus; rejectReason?: RejectReason };

export type StagePlan =
  | { ok: false; error: string }
  | {
      ok: true;
      /** Fields to write on the candidate. Empty when nothing changes. */
      data: Record<string, unknown>;
      fromStage: PipelineStage;
      /** Set when the stage itself changes. */
      toStage: PipelineStage | null;
      /** Legacy status after the change. */
      status: string;
    };

/**
 * Work out what a stage (or legacy status) request does to a candidate.
 * Returns an error for anything that would pass someone or undo a pass.
 */
export function planStageChange(
  existing: { stage: string; status: string },
  req: StageRequest,
  now: Date = new Date(),
): StagePlan {
  if (req.stage === "passed" || req.status === "passed" || req.status === "hired") {
    return { ok: false, error: PASS_REFUSAL };
  }
  const from = normalizeStage(existing.stage);
  const archived = existing.status === "archived";

  // Archiving only flags the record; it is not a stage.
  if (!req.stage && req.status === "archived") {
    return { ok: true, data: archived ? {} : { status: "archived" }, fromStage: from, toStage: null, status: "archived" };
  }

  let to: PipelineStage | null = null;
  if (req.stage) to = TO_PIPELINE[req.stage];
  else if (req.status === "rejected") to = "REJECTED";
  else if (req.status === "active") {
    // Legacy "active": un-archive, and reopen a Not passed candidate.
    to = from === "REJECTED" ? "SCREENING" : from;
  }
  if (!to) return { ok: false, error: "Give a stage: new, screening or not_passed." };

  // Any stage or status change on a passed candidate would undo the pass.
  if (from === "PASSED") return { ok: false, error: UNPASS_REFUSAL };

  const data: Record<string, unknown> = {};
  let status = existing.status;
  if (to === "REJECTED") {
    if (!archived) status = "rejected";
    if (from !== "REJECTED") {
      data.stage = "REJECTED";
      data.rejectReason = req.rejectReason ?? "OTHER";
      data.stageChangedAt = now;
    } else if (req.rejectReason) {
      data.rejectReason = req.rejectReason;
    }
  } else {
    // New or Screening.
    status = req.status === "active" || !archived ? "active" : existing.status;
    if (from !== to) {
      data.stage = to;
      data.stageChangedAt = now;
    }
    if (from === "REJECTED") {
      data.rejectReason = null;
      data.rejectReasonNote = null;
    }
  }
  if (status !== existing.status) data.status = status;
  return { ok: true, data, fromStage: from, toStage: from !== to ? to : null, status };
}
