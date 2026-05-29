/**
 * Take-home email lifecycle helpers (IP-27). Thin wrappers over the typed
 * email service so triggers (assign action, submit endpoint, reminder cron)
 * stay declarative. Mirrors src/lib/ai-interview/{invite-email,submit-notify}.
 *
 * All sends are fire-and-forget at the call site: a transport failure must
 * never roll back the underlying action (assignment created, submission saved).
 */
import { sendEmail, sendTemplatedBatch, type BatchSendResult } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/** Base URL for candidate/recruiter links — matches the AI-screening helper. */
export function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function takeHomeUrl(token: string): string {
  return `${appBaseUrl()}/take-home/${token}`;
}

/** Async multi-question take-home session runner link (IP-88). */
export function takeHomeSessionUrl(token: string): string {
  return `${appBaseUrl()}/take-home/s/${token}`;
}

/**
 * Bulk invites for session-backed multi-question take-homes (IP-88) — sent via
 * the Resend batch path. Each row already has its own InterviewSession +
 * candidateAccessToken (created by bulkCreateTakeHomeSessions).
 */
export async function sendBulkTakeHomeSessionInvites(args: {
  workspaceId: string;
  workspaceName: string;
  title: string;
  questionCount: number;
  deadlineAt: Date;
  rows: { name: string; email: string; token: string; sessionId: string }[];
}): Promise<BatchSendResult> {
  return sendTemplatedBatch(
    "take-home-session-invite",
    args.rows.map((r) => ({
      to: r.email,
      props: {
        candidateName: r.name,
        title: args.title,
        workspaceName: args.workspaceName,
        takeHomeUrl: takeHomeSessionUrl(r.token),
        questionCount: args.questionCount,
        deadlineAt: args.deadlineAt.toISOString(),
      },
      workspaceId: args.workspaceId,
      sessionId: r.sessionId,
    })),
  );
}

export async function sendTakeHomeInvite(args: {
  candidateName: string;
  candidateEmail: string;
  challengeTitle: string;
  workspaceName: string;
  token: string;
  timeLimitMin: number;
  expiresAt: Date;
  workspaceId?: string;
  takeHomeId?: string;
}) {
  return sendEmail({
    template: "take-home-invite",
    to: args.candidateEmail,
    props: {
      candidateName: args.candidateName,
      challengeTitle: args.challengeTitle,
      workspaceName: args.workspaceName,
      takeHomeUrl: takeHomeUrl(args.token),
      timeLimitMin: args.timeLimitMin,
      expiresAt: args.expiresAt.toISOString(),
    },
    workspaceId: args.workspaceId,
    sessionId: args.takeHomeId,
    // Stable key so an accidental double-assign / retry doesn't double-email.
    idempotencyKey: args.takeHomeId ? `th-invite:${args.takeHomeId}` : undefined,
  });
}

/**
 * Bulk take-home invites (IP-72) — one challenge → many candidates, sent via
 * Resend's batch endpoint so a 50–100 candidate dispatch is a single API call
 * instead of a rate-limited sequential loop. Each row already has its own
 * assignment + token (created by bulkDispatchTakeHomesAction before this runs).
 */
export async function sendBulkTakeHomeInvites(args: {
  workspaceId: string;
  workspaceName: string;
  challengeTitle: string;
  timeLimitMin: number;
  expiresAt: Date;
  rows: { name: string; email: string; token: string; takeHomeId: string }[];
}): Promise<BatchSendResult> {
  return sendTemplatedBatch(
    "take-home-invite",
    args.rows.map((r) => ({
      to: r.email,
      props: {
        candidateName: r.name,
        challengeTitle: args.challengeTitle,
        workspaceName: args.workspaceName,
        takeHomeUrl: takeHomeUrl(r.token),
        timeLimitMin: args.timeLimitMin,
        expiresAt: args.expiresAt.toISOString(),
      },
      workspaceId: args.workspaceId,
      sessionId: r.takeHomeId,
    })),
  );
}

export async function sendTakeHomeReminder(args: {
  candidateName: string;
  candidateEmail: string;
  challengeTitle: string;
  workspaceName: string;
  token: string;
  expiresAt: Date;
  hoursLeft: number;
  workspaceId?: string;
  takeHomeId: string;
}) {
  return sendEmail({
    template: "take-home-reminder",
    to: args.candidateEmail,
    props: {
      candidateName: args.candidateName,
      challengeTitle: args.challengeTitle,
      workspaceName: args.workspaceName,
      takeHomeUrl: takeHomeUrl(args.token),
      expiresAt: args.expiresAt.toISOString(),
      hoursLeft: args.hoursLeft,
    },
    workspaceId: args.workspaceId,
    sessionId: args.takeHomeId,
    idempotencyKey: `th-reminder:${args.takeHomeId}`,
  });
}

/**
 * On submit: confirm to the candidate + notify workspace recruiters
 * (OWNER/ADMIN/INTERVIEWER, same recipient rule as AI screening). Looks up
 * everything it needs from the takeHomeId so call sites stay tiny.
 */
export async function sendTakeHomeSubmissionEmails(args: {
  takeHomeId: string;
  score: number | null;
}) {
  const th = await prisma.takeHomeAssignment.findUnique({
    where: { id: args.takeHomeId },
    select: {
      candidateName: true,
      candidateEmail: true,
      challenge: { select: { title: true } },
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          members: {
            where: { role: { in: ["OWNER", "ADMIN", "INTERVIEWER"] } },
            select: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });
  if (!th || !th.workspace) return;

  const challengeTitle = th.challenge.title;
  const workspaceName = th.workspace.name;
  const workspaceId = th.workspace.id;

  // 1. Candidate confirmation.
  const candidateSend = th.candidateEmail
    ? sendEmail({
        template: "take-home-submitted-candidate",
        to: th.candidateEmail,
        props: { candidateName: th.candidateName, challengeTitle, workspaceName },
        workspaceId,
        sessionId: args.takeHomeId,
        idempotencyKey: `th-submit-candidate:${args.takeHomeId}`,
      })
    : Promise.resolve();

  // 2. Recruiter notify, fanned out per member.
  const reviewUrl = `${appBaseUrl()}/w/${th.workspace.slug}?section=assessments&view=take-homes`;
  const recruiterSends = th.workspace.members
    .filter((m) => !!m.user.email)
    .map((m) =>
      sendEmail({
        template: "take-home-submitted-recruiter",
        to: m.user.email!,
        props: {
          recruiterName: m.user.name || "there",
          candidateName: th.candidateName,
          challengeTitle,
          workspaceName,
          reviewUrl,
          score: args.score,
        },
        workspaceId,
        sessionId: args.takeHomeId,
        idempotencyKey: `th-submit-recruiter:${args.takeHomeId}:${m.user.email}`,
      }),
    );

  await Promise.allSettled([candidateSend, ...recruiterSends]);
}
