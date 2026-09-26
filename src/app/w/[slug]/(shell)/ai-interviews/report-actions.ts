"use server";

/**
 * Server actions for the AI screening report additions: running a round's
 * tests, and creating, listing and revoking read-only share links. Each
 * returns a result object instead of throwing, like the other screening
 * actions, so the recruiter sees the real reason when something fails.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { effectivePlanAllowsAiScreening } from "@/lib/billing/trial";
import { rateLimit } from "@/lib/rate-limit";
import { appOrigin } from "@/lib/interview/links";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { resolveSessionRounds } from "@/lib/ai-interview/rounds";
import { loadChallengeTestFiles, runRoundTests } from "@/lib/ai-interview/round-tests";
import { serializeTestRun, type TestRun } from "@/lib/ai-interview/report-extras";
import { shareExpiry, shareLinkState, signShareToken, type ShareLinkState } from "@/lib/ai-interview/report-share";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message };
  console.error("[ai-report action]", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

/** Signed in, a member, on a plan with AI screening, and allowed to run interviews. */
async function assertReportWriter(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new ActionError("Sign in again to continue.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new ActionError("Workspace not found.");
  const member = workspace.members[0];
  if (!member) throw new ActionError("You are not a member of this workspace.");
  if (!effectivePlanAllowsAiScreening(workspace)) throw new ActionError("This workspace plan does not include AI screening.");
  if (!(await canMember(member, "interview:conduct"))) throw new ActionError("You do not have permission to manage AI screenings.");
  return { workspaceId: workspace.id, userId: session.user.id, email: session.user.email ?? null };
}

/* ── Tests ───────────────────────────────────────────────────────────────── */

export async function runRoundTestsAction(slug: string, sessionId: string, roundId: string): Promise<Result<{ tests: TestRun }>> {
  try {
    const w = await assertReportWriter(slug);
    if (!rateLimit(`ai-report-tests:${w.userId}`, 20, 10 * 60_000).ok) throw new ActionError("Too many test runs. Wait a few minutes and try again.");
    const s = await prisma.aIInterviewSession.findFirst({
      where: { id: sessionId, workspaceId: w.workspaceId, practice: false },
      include: { rounds: true },
    });
    if (!s) throw new ActionError("Screening not found.");
    const round = resolveSessionRounds(s).find((r) => r.id === roundId);
    if (!round || round.legacy || round.sourceKind !== "challenge" || !round.sourceId) throw new ActionError("This round has no tests to run.");
    const testFiles = (await loadChallengeTestFiles([round.sourceId])).get(round.sourceId);
    if (!testFiles) throw new ActionError("This round has no tests to run.");
    let files: Record<string, string> = {};
    try {
      files = JSON.parse(round.filesJson || "{}");
    } catch {
      files = {};
    }
    if (!Object.keys(files).length) throw new ActionError("There is no candidate code to test yet.");

    let tests: TestRun;
    try {
      tests = await runRoundTests(files, testFiles);
    } catch (err) {
      console.error("[ai-report tests] runner failed", err);
      throw new ActionError("The test runner could not be reached. Try again in a minute.");
    }
    await prisma.aIInterviewRound.update({
      where: { id: round.id },
      data: { testResultsJson: serializeTestRun(tests), testsRunAt: new Date(tests.ranAt ?? Date.now()) },
    });
    return { ok: true, tests };
  } catch (err) {
    return fail(err);
  }
}

/* ── Share links ─────────────────────────────────────────────────────────── */

export type ShareLinkRow = {
  id: string;
  url: string | null;
  state: ShareLinkState;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  viewCount: number;
  lastViewedAt: string | null;
};

async function toRows(links: { id: string; expiresAt: Date; revokedAt: Date | null; createdAt: Date; createdByUserId: string; viewCount: number; lastViewedAt: Date | null }[], viewerId: string): Promise<ShareLinkRow[]> {
  const origin = await appOrigin();
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(links.map((l) => l.createdByUserId))] } },
    select: { id: true, name: true, email: true },
  });
  const who = new Map(users.map((u) => [u.id, u.name ?? u.email ?? "A teammate"]));
  const now = Date.now();
  return links.map((l) => {
    const state = shareLinkState(l, now);
    return {
      id: l.id,
      // The token is derived from the row, so an active link can be copied again.
      url: state === "active" ? `${origin}/share/screening/${signShareToken(l.id, l.expiresAt)}` : null,
      state,
      expiresAt: l.expiresAt.toISOString(),
      createdAt: l.createdAt.toISOString(),
      createdBy: l.createdByUserId === viewerId ? "You" : (who.get(l.createdByUserId) ?? "A teammate"),
      viewCount: l.viewCount,
      lastViewedAt: l.lastViewedAt?.toISOString() ?? null,
    };
  });
}

async function sessionInWorkspace(sessionId: string, workspaceId: string) {
  const s = await prisma.aIInterviewSession.findFirst({
    where: { id: sessionId, workspaceId, practice: false },
    select: { id: true, status: true, candidateName: true },
  });
  if (!s) throw new ActionError("Screening not found.");
  return s;
}

export async function listShareLinksAction(slug: string, sessionId: string): Promise<Result<{ links: ShareLinkRow[] }>> {
  try {
    const w = await assertReportWriter(slug);
    await sessionInWorkspace(sessionId, w.workspaceId);
    const links = await prisma.aIReportShareLink.findMany({
      where: { sessionId, workspaceId: w.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { ok: true, links: await toRows(links, w.userId) };
  } catch (err) {
    return fail(err);
  }
}

export async function createShareLinkAction(slug: string, sessionId: string): Promise<Result<{ link: ShareLinkRow }>> {
  try {
    const w = await assertReportWriter(slug);
    const s = await sessionInWorkspace(sessionId, w.workspaceId);
    if (s.status !== "COMPLETED") throw new ActionError("You can share the report once the candidate has finished.");
    const active = await prisma.aIReportShareLink.count({ where: { sessionId, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (active >= 10) throw new ActionError("This report already has 10 active links. Revoke one first.");
    const link = await prisma.aIReportShareLink.create({
      data: { workspaceId: w.workspaceId, sessionId, createdByUserId: w.userId, expiresAt: shareExpiry() },
    });
    await writeWorkspaceAuditEntry({
      workspaceId: w.workspaceId,
      actorUserId: w.userId,
      actorEmail: w.email,
      action: WORKSPACE_AUDIT_ACTIONS.AI_REPORT_SHARE_CREATED,
      targetType: "aiInterviewSession",
      targetId: sessionId,
      meta: { linkId: link.id, candidate: s.candidateName, expiresAt: link.expiresAt.toISOString() },
    });
    const [row] = await toRows([link], w.userId);
    return { ok: true, link: row };
  } catch (err) {
    return fail(err);
  }
}

export async function revokeShareLinkAction(slug: string, linkId: string): Promise<Result> {
  try {
    const w = await assertReportWriter(slug);
    const link = await prisma.aIReportShareLink.findFirst({ where: { id: linkId, workspaceId: w.workspaceId } });
    if (!link) throw new ActionError("Link not found.");
    if (!link.revokedAt) {
      await prisma.aIReportShareLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
      await writeWorkspaceAuditEntry({
        workspaceId: w.workspaceId,
        actorUserId: w.userId,
        actorEmail: w.email,
        action: WORKSPACE_AUDIT_ACTIONS.AI_REPORT_SHARE_REVOKED,
        targetType: "aiInterviewSession",
        targetId: link.sessionId,
        meta: { linkId: link.id },
      });
    }
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
