/**
 * Production notification triggers (IP-44).
 *
 * One helper per real event source. Each helper:
 *   - Resolves the recipient set (often a small Prisma read)
 *   - Calls `createNotification` per recipient
 *   - Owns its own dedup logic where the event can fire repeatedly
 *
 * Every helper swallows errors and logs them with a `[notify]` prefix. A
 * notification write failure must NEVER block the user-facing action that
 * produced the event — same defense-in-depth pattern as `recordEvent` in
 * /profile/security/actions.ts and the audit log in auth.ts.
 *
 * Call sites stay tiny: one line, fire-and-forget, no awaiting required if
 * you don't care to surface failure (we do await internally to satisfy the
 * "no unhandled-promise" lint rule).
 */
import { prisma } from "@/lib/prisma";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

function logErr(event: string, err: unknown) {
  console.error(`[notify] ${event} failed:`, err);
}

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Take-home submitted by candidate
 * ────────────────────────────────────────────────────────────────────────── */
export async function notifyTakeHomeSubmitted(args: {
  workspaceId: string;
  workspaceSlug: string;
  candidateName: string;
  challengeTitle: string;
  takeHomeId: string;
  candidateId: string | null;
}) {
  try {
    const admins = await prisma.workspaceMember.findMany({
      where: { workspaceId: args.workspaceId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });
    const href = args.candidateId
      ? `/w/${args.workspaceSlug}/candidates/${args.candidateId}`
      : `/w/${args.workspaceSlug}`;
    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.userId,
          type: NOTIFICATION_TYPES.TAKE_HOME_SUBMITTED,
          title: `${args.candidateName} submitted ${args.challengeTitle}`,
          body: "Take-home submission is in — open it to review the attempt.",
          href,
          payload: { takeHomeId: args.takeHomeId, candidateId: args.candidateId },
        }),
      ),
    );
  } catch (err) {
    logErr("TAKE_HOME_SUBMITTED", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 2. Interview reached `completed` — replay is ready
 * ────────────────────────────────────────────────────────────────────────── */
export async function notifyInterviewReplayReady(args: {
  sessionId: string;
  ownerId: string;
  title: string;
  type: string; // "mock" | "live"
}) {
  // Mock sessions are self-completion; the candidate just clicked "End" and
  // doesn't need a notification telling them they did it.
  if (args.type === "mock") return;
  try {
    await createNotification({
      userId: args.ownerId,
      type: NOTIFICATION_TYPES.INTERVIEW_REPLAY_READY,
      title: `Replay ready: ${args.title}`,
      body: "Telemetry and timeline are queued — open the session to review.",
      href: `/interview/${args.sessionId}`,
      payload: { sessionId: args.sessionId },
    });
  } catch (err) {
    logErr("INTERVIEW_REPLAY_READY", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Session completed but no rubric — scorecard requested
 * ────────────────────────────────────────────────────────────────────────── */
export async function notifyScorecardRequested(args: {
  sessionId: string;
  ownerId: string;
  title: string;
  type: string;
}) {
  if (args.type === "mock") return;
  try {
    // Dedup per session — re-completing or amending should not re-notify.
    const recent = await prisma.notification.findMany({
      where: {
        userId: args.ownerId,
        type: NOTIFICATION_TYPES.SCORECARD_REQUESTED,
        createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { payload: true },
      take: 50,
    });
    const already = recent.some((r) => {
      if (!r.payload) return false;
      try {
        return (JSON.parse(r.payload) as { sessionId?: string }).sessionId === args.sessionId;
      } catch {
        return false;
      }
    });
    if (already) return;

    await createNotification({
      userId: args.ownerId,
      type: NOTIFICATION_TYPES.SCORECARD_REQUESTED,
      title: `Scorecard needed: ${args.title}`,
      body: "Session is complete but no rubric is saved yet.",
      href: `/interview/${args.sessionId}`,
      payload: { sessionId: args.sessionId },
    });
  } catch (err) {
    logErr("SCORECARD_REQUESTED", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4. Live interview scheduled — notify the candidate (if known)
 * ────────────────────────────────────────────────────────────────────────── */
export async function notifyInterviewScheduled(args: {
  sessionId: string;
  shareToken: string;
  title: string;
  type: string;
  candidateEmail: string | null;
  actorId: string;
}) {
  if (args.type !== "live") return;
  if (!args.candidateEmail) return;
  try {
    const user = await prisma.user.findUnique({
      where: { email: args.candidateEmail.toLowerCase() },
      select: { id: true },
    });
    // Silent skip if the candidate doesn't have an Interviewpad account —
    // they'll learn about the session via email (IP-24) or the share link
    // their recruiter sent.
    if (!user) return;
    if (user.id === args.actorId) return; // self-scheduled (mock-ish edge)
    await createNotification({
      userId: user.id,
      type: NOTIFICATION_TYPES.INTERVIEW_SCHEDULED,
      title: `Live interview scheduled: ${args.title}`,
      body: "Open the link from your recruiter to join the session when it starts.",
      href: `/interview/${args.sessionId}?token=${args.shareToken}`,
      payload: { sessionId: args.sessionId },
    });
  } catch (err) {
    logErr("INTERVIEW_SCHEDULED", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 5. Prompt attempt upvoted
 * ────────────────────────────────────────────────────────────────────────── */
export async function notifyPromptUpvoted(args: {
  attemptId: string;
  authorId: string;
  upvoterId: string;
  newCount: number;
  scenarioTitle: string | null;
}) {
  if (args.authorId === args.upvoterId) return; // self-upvote already blocked upstream
  try {
    await createNotification({
      userId: args.authorId,
      type: NOTIFICATION_TYPES.PROMPT_UPVOTED,
      title: "Your shared prompt was upvoted",
      body: args.scenarioTitle
        ? `"${args.scenarioTitle}" — now at ${args.newCount} upvote${args.newCount === 1 ? "" : "s"}.`
        : `Now at ${args.newCount} upvote${args.newCount === 1 ? "" : "s"}.`,
      href: `/interview/prompt-practice?attempt=${args.attemptId}`,
      payload: { attemptId: args.attemptId, newCount: args.newCount },
    });
  } catch (err) {
    logErr("PROMPT_UPVOTED", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 6. Workspace AI credits running low
 *    Threshold: < 5 sessions worth remaining (default per IP-44 sanity-check).
 *    Dedup: skip if any AI_CREDITS_LOW notification was created for any
 *           admin of this workspace in the last 24h.
 * ────────────────────────────────────────────────────────────────────────── */
const AI_CREDITS_LOW_THRESHOLD = 5;
const AI_CREDITS_LOW_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function notifyAiCreditsLowIfNeeded(args: {
  workspaceId: string;
  balance: number;
}) {
  if (args.balance > AI_CREDITS_LOW_THRESHOLD) return;
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: args.workspaceId },
      select: {
        slug: true,
        members: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
          select: { userId: true },
        },
      },
    });
    if (!workspace) return;
    const adminUserIds = workspace.members.map((m) => m.userId);
    if (adminUserIds.length === 0) return;

    const recent = await prisma.notification.findFirst({
      where: {
        userId: { in: adminUserIds },
        type: NOTIFICATION_TYPES.AI_CREDITS_LOW,
        createdAt: { gt: new Date(Date.now() - AI_CREDITS_LOW_DEDUP_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    await Promise.all(
      adminUserIds.map((userId) =>
        createNotification({
          userId,
          type: NOTIFICATION_TYPES.AI_CREDITS_LOW,
          title: `AI credits running low (${args.balance} remaining)`,
          body:
            args.balance === 0
              ? "Workspace is out of AI screening credits. New sessions will be blocked until you top up."
              : `Roughly ${args.balance} session${args.balance === 1 ? "" : "s"} remaining. Top up to avoid interruption.`,
          href: `/w/${workspace.slug}/ai-interviews`,
          payload: { workspaceId: args.workspaceId, balance: args.balance },
        }),
      ),
    );
  } catch (err) {
    logErr("AI_CREDITS_LOW", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 7 + 8. Security self-notifications
 * ────────────────────────────────────────────────────────────────────────── */
export async function notify2faEnabled(userId: string) {
  try {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.SECURITY_2FA_ENABLED,
      title: "Two-factor authentication enabled",
      body: "Your account now requires a code from your authenticator app at sign-in.",
      href: "/profile/security",
    });
  } catch (err) {
    logErr("SECURITY_2FA_ENABLED", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 9. Take-home expiring in <24h (cron-driven, IP-46)
 *    Dedup: per-recipient per-takeHomeId — once they've been told this
 *    assignment is expiring, we don't tell them again from a later cron tick.
 * ────────────────────────────────────────────────────────────────────────── */
export async function notifyTakeHomeExpiringForAssignment(args: {
  takeHomeId: string;
  workspaceId: string;
  workspaceSlug: string;
  candidateName: string;
  candidateEmail: string | null;
  challengeTitle: string;
  hoursLeft: number;
}): Promise<{ created: number }> {
  try {
    // Recipient set: workspace OWNER/ADMIN + the candidate (if their email
    // resolves to a User account). Stable userId order so dedup checks
    // batch nicely.
    const admins = await prisma.workspaceMember.findMany({
      where: { workspaceId: args.workspaceId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });
    const recipientIds = new Set<string>(admins.map((a) => a.userId));
    if (args.candidateEmail) {
      const cand = await prisma.user.findUnique({
        where: { email: args.candidateEmail.toLowerCase() },
        select: { id: true },
      });
      if (cand) recipientIds.add(cand.id);
    }
    if (recipientIds.size === 0) return { created: 0 };

    // Dedup: skip any recipient who already has a TAKE_HOME_EXPIRING for
    // this takeHomeId. We do ONE query over the whole batch instead of one
    // per recipient.
    const existing = await prisma.notification.findMany({
      where: {
        userId: { in: Array.from(recipientIds) },
        type: NOTIFICATION_TYPES.TAKE_HOME_EXPIRING,
      },
      select: { userId: true, payload: true },
    });
    const alreadyNotified = new Set<string>();
    for (const e of existing) {
      if (!e.payload) continue;
      try {
        const p = JSON.parse(e.payload) as { takeHomeId?: string };
        if (p.takeHomeId === args.takeHomeId) alreadyNotified.add(e.userId);
      } catch {
        // ignore malformed payload
      }
    }
    const fresh = Array.from(recipientIds).filter((id) => !alreadyNotified.has(id));
    if (fresh.length === 0) return { created: 0 };

    const candidateHref = `/take-home/`; // candidate-facing — they have the token-link from their email
    const adminHref = `/w/${args.workspaceSlug}`;
    // createNotification can short-circuit when the recipient has opted out
    // (IP-47). Count actual inserts rather than recipients-attempted.
    const results = await Promise.all(
      fresh.map((userId) =>
        createNotification({
          userId,
          type: NOTIFICATION_TYPES.TAKE_HOME_EXPIRING,
          title: `Take-home expiring in ${Math.max(1, args.hoursLeft)}h`,
          body: `${args.candidateName} hasn't submitted ${args.challengeTitle} yet.`,
          // Candidates get a personal nudge; admins get a workspace link.
          // We don't know per-userId here which role they have; default to
          // the workspace link (admins will need it, candidates will follow
          // the original email).
          href: adminHref,
          payload: {
            takeHomeId: args.takeHomeId,
            workspaceId: args.workspaceId,
            hoursLeft: args.hoursLeft,
          },
        }),
      ),
    );
    const created = results.filter(
      (r) => !(r as { skipped?: boolean }).skipped,
    ).length;
    return { created };
  } catch (err) {
    logErr("TAKE_HOME_EXPIRING", err);
    return { created: 0 };
  }
}

export async function notify2faDisabled(userId: string) {
  try {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.SECURITY_2FA_DISABLED,
      title: "Two-factor authentication disabled",
      body: "If this wasn't you, change your password and re-enable 2FA immediately.",
      href: "/profile/security",
    });
  } catch (err) {
    logErr("SECURITY_2FA_DISABLED", err);
  }
}
