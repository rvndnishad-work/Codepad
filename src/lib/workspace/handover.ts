/**
 * Handing over a member's work when they are removed from a workspace.
 * Pure, so the remove dialog, the server action and the tests share the
 * same rules: who can take the work, which choices are required, and what
 * happens to each upcoming interview.
 *
 * What moves:
 *   - candidates (and hiring batches) they own go to a new owner
 *   - upcoming interviews they host go to a replacement interviewer, or are
 *     cancelled and the candidate is told
 *   - open take-homes they sent go to a new reviewer
 * What goes: their API keys are revoked and their calendar is disconnected.
 * What stays: notes, scorecards and past interviews keep their name.
 */
import { parsePanel } from "@/lib/interview/wizard";

export type InterviewHandoverMode = "reassign" | "cancel";

/** A member who could take over work. Viewers cannot own or run anything. */
export type HandoverCandidate = { id: string; userId: string; role: string };

export function canTakeOverWork(m: { role: string }): boolean {
  return m.role !== "VIEWER";
}

/** Members (other than the one leaving) who can receive work, in the order given. */
export function handoverTargets<M extends HandoverCandidate>(members: M[], leavingMemberId: string): M[] {
  return members.filter((m) => m.id !== leavingMemberId && canTakeOverWork(m));
}

/** What the leaving member has, as counted by the server before the dialog opens. */
export type HandoverCounts = {
  candidates: number;
  batches: number;
  /** Upcoming interviews they host. */
  hostedInterviews: number;
  /** Upcoming interviews where they are only on the panel or picking questions. */
  panelInterviews: number;
  /** Open take-homes they sent that still need a decision. */
  reviews: number;
  apiKeys: number;
  calendar: boolean;
};

export type HandoverChoices = {
  /** userId of the new owner for candidates and batches. */
  ownerUserId: string | null;
  interviewMode: InterviewHandoverMode;
  /** userId of the replacement interviewer, when interviewMode is "reassign". */
  interviewerUserId: string | null;
  /** userId of the new reviewer for open take-homes. */
  reviewerUserId: string | null;
};

export type HandoverCheck = { ok: true } | { ok: false; errors: Partial<Record<"owner" | "interviewer" | "reviewer", string>> };

/**
 * Which choices are missing or invalid. A choice is only required when there
 * is work of that kind, and every person picked must be able to take work.
 */
export function checkHandover(
  counts: HandoverCounts,
  choices: HandoverChoices,
  eligibleUserIds: ReadonlySet<string> | string[],
): HandoverCheck {
  const eligible = eligibleUserIds instanceof Set ? eligibleUserIds : new Set(eligibleUserIds);
  const errors: Partial<Record<"owner" | "interviewer" | "reviewer", string>> = {};
  const pick = (id: string | null, needed: boolean, field: "owner" | "interviewer" | "reviewer", missing: string) => {
    if (!needed) return;
    if (!id) errors[field] = missing;
    else if (!eligible.has(id)) errors[field] = "Pick someone who is staying in the workspace and is not a viewer.";
  };
  pick(choices.ownerUserId, counts.candidates + counts.batches > 0, "owner", "Pick who takes over their candidates.");
  // Interviews they only join need no replacement: they just come off the panel.
  pick(choices.interviewerUserId, counts.hostedInterviews > 0 && choices.interviewMode === "reassign", "interviewer", "Pick who runs their upcoming interviews.");
  if (!errors.interviewer && choices.interviewerUserId && !eligible.has(choices.interviewerUserId)) {
    errors.interviewer = "Pick someone who is staying in the workspace and is not a viewer.";
  }
  pick(choices.reviewerUserId, counts.reviews > 0, "reviewer", "Pick who reviews their open take-homes.");
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

/** One upcoming interview the leaving member is part of. */
export type UpcomingInterview = {
  id: string;
  userId: string;
  panelJson: string | null;
  questionsOwnerId: string | null;
};

export type InterviewChange = {
  id: string;
  /** "cancel" cancels the interview; "update" rewrites host, panel or question owner. */
  kind: "cancel" | "update";
  /** New host, when it changes. */
  userId?: string;
  panelJson?: string;
  questionsOwnerId?: string | null;
  /** True when the leaving member hosted it, so the calendar event moves. */
  hostChanged: boolean;
};

/**
 * What happens to one upcoming interview. Hosted interviews go to the
 * replacement or are cancelled. On interviews they only join, they drop off
 * the panel (and the replacement takes their seat when reassigning). If they
 * were picking the questions, the replacement or the host picks them now.
 */
export function planInterviewChange(
  s: UpcomingInterview,
  leavingUserId: string,
  mode: InterviewHandoverMode,
  replacementUserId: string | null,
): InterviewChange | null {
  const hosted = s.userId === leavingUserId;
  const panel = parsePanel(s.panelJson);
  const onPanel = panel.includes(leavingUserId);
  const picksQuestions = s.questionsOwnerId === leavingUserId;
  if (!hosted && !onPanel && !picksQuestions) return null;

  if (hosted && mode === "cancel") return { id: s.id, kind: "cancel", hostChanged: true };

  const reassign = mode === "reassign" && !!replacementUserId;
  const host = hosted && reassign ? replacementUserId! : s.userId;
  let nextPanel = panel.filter((id) => id !== leavingUserId);
  if (onPanel && reassign && replacementUserId !== host && !nextPanel.includes(replacementUserId!)) {
    nextPanel.push(replacementUserId!);
  }
  // The host never also sits on the panel.
  nextPanel = nextPanel.filter((id) => id !== host);

  const change: InterviewChange = { id: s.id, kind: "update", hostChanged: hosted };
  if (host !== s.userId) change.userId = host;
  if (onPanel || nextPanel.length !== panel.length || nextPanel.some((id, i) => id !== panel[i])) change.panelJson = JSON.stringify(nextPanel);
  if (picksQuestions) change.questionsOwnerId = reassign ? replacementUserId : host;
  return change;
}

/** Sentence for the handover summary in the dialog and the toast. */
export function handoverSummary(counts: HandoverCounts, mode: InterviewHandoverMode): string[] {
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  const lines: string[] = [];
  if (counts.candidates) lines.push(`${n(counts.candidates, "candidate")} get a new owner.`);
  if (counts.batches) lines.push(`${n(counts.batches, "hiring batch", "hiring batches")} get a new owner.`);
  if (counts.hostedInterviews) {
    lines.push(
      mode === "cancel"
        ? `${n(counts.hostedInterviews, "upcoming interview")} they host ${counts.hostedInterviews === 1 ? "is" : "are"} cancelled and the candidate is told.`
        : `${n(counts.hostedInterviews, "upcoming interview")} they host ${counts.hostedInterviews === 1 ? "moves" : "move"} to a new interviewer.`,
    );
  }
  if (counts.panelInterviews) lines.push(`They come off the panel of ${n(counts.panelInterviews, "other interview")}.`);
  if (counts.reviews) lines.push(`${n(counts.reviews, "open take-home")} ${counts.reviews === 1 ? "gets" : "get"} a new reviewer.`);
  if (counts.apiKeys) lines.push(`${n(counts.apiKeys, "API key")} they made ${counts.apiKeys === 1 ? "is" : "are"} revoked.`);
  if (counts.calendar) lines.push("Their calendar is disconnected.");
  return lines;
}
