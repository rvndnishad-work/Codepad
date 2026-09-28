import { prisma } from "@/lib/prisma";
import { grantDue, includedStep, TRIAL_CREDITS } from "./included-credits";

/**
 * Runs the monthly included-credit step for one workspace if it is due:
 * expires included credits older than a month and adds this month of
 * credits for each seat. Safe to call from the daily cron and right after a
 * subscription starts; a compare-and-set on the grant time means two callers
 * cannot both grant.
 */
export async function runIncludedCreditsIfDue(
  workspaceId: string,
  now: Date = new Date(),
): Promise<{ ran: boolean; expired: number; granted: number }> {
  return prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        planName: true,
        includedCreditsLeft: true,
        includedCreditsLastGrant: true,
        includedCreditsGrantedAt: true,
        _count: { select: { members: true } },
      },
    });
    if (!ws) return { ran: false, expired: 0, granted: 0 };

    const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    const state = {
      planName: ws.planName,
      seats: ws._count.members,
      includedCreditsLeft: ws.includedCreditsLeft,
      includedCreditsLastGrant: ws.includedCreditsLastGrant,
      includedCreditsGrantedAt: ws.includedCreditsGrantedAt,
      balance: agg._sum.amount ?? 0,
    };
    if (!grantDue(state, now)) return { ran: false, expired: 0, granted: 0 };

    const step = includedStep(state);
    const claimed = await tx.workspace.updateMany({
      where: { id: workspaceId, includedCreditsGrantedAt: ws.includedCreditsGrantedAt },
      data: {
        includedCreditsLeft: step.left,
        includedCreditsLastGrant: step.lastGrant,
        includedCreditsGrantedAt: now,
      },
    });
    if (claimed.count === 0) return { ran: false, expired: 0, granted: 0 };

    if (step.expire > 0) {
      await tx.aIInterviewCreditLedger.create({
        data: {
          workspaceId,
          kind: "INCLUDED_EXPIRED",
          amount: -step.expire,
          note: "Included credits older than one month",
        },
      });
    }
    if (step.grant > 0) {
      await tx.aIInterviewCreditLedger.create({
        data: {
          workspaceId,
          kind: "INCLUDED",
          amount: step.grant,
          note: `${state.seats} ${state.seats === 1 ? "seat" : "seats"} on ${ws.planName}`,
        },
      });
    }
    return { ran: true, expired: step.expire, granted: step.grant };
  });
}

/** Workspaces the daily cron should look at: paid ones, and any with included credits left. */
export async function workspacesForIncludedCredits(): Promise<string[]> {
  const rows = await prisma.workspace.findMany({
    where: {
      OR: [
        { planName: { in: ["GROWTH", "ENTERPRISE"] } },
        { includedCreditsLeft: { gt: 0 } },
      ],
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Gives a new workspace its trial credits, once per person: a creator who
 * already owns a workspace that got trial credits gets none, so making new
 * workspaces is not a way to get free screenings.
 */
export async function grantTrialCredits(workspaceId: string, creatorUserId: string): Promise<boolean> {
  const earlier = await prisma.aIInterviewCreditLedger.findFirst({
    where: {
      kind: "TRIAL",
      workspace: { members: { some: { userId: creatorUserId, role: "OWNER" } } },
    },
    select: { id: true },
  });
  if (earlier) return false;
  await prisma.aIInterviewCreditLedger.create({
    data: { workspaceId, kind: "TRIAL", amount: TRIAL_CREDITS, note: "Free trial credits" },
  });
  return true;
}
