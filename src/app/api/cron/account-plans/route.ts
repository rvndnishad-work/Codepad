import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronRun } from "@/lib/admin/cron-run";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { PREPAID_REMINDER_DAYS } from "@/lib/billing/prepaid";
import { CATALOG_PLANS } from "@/lib/billing/catalog";
import { isSelfServePlan } from "@/lib/billing/account-plan";
import { runPlanCreditsIfDue, syncAccountWorkspaces } from "@/lib/billing/account-plan-server";

/**
 * The new plans on billing accounts (Basic, Growth, Teams), hourly.
 *
 * 1. Reminder: accounts whose paid-until date is within PREPAID_REMINDER_DAYS
 *    get one "renews soon" notice per period (reminderAt stamps it; a new
 *    payment clears it).
 * 2. Lapse: accounts past their paid-until date have their workspaces moved
 *    to Free (gates already treat them as Free the moment the date passes;
 *    this makes planName agree), and owners and admins are told. The plan
 *    stays on the account as history and for Billing to show.
 * 3. Plan credits: the monthly step (grant, and expiry of credits older than
 *    a month) for every account that is due.
 */
const MAX_BATCH = 200;
const DAY_MS = 86_400_000;
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Account = { id: string; planKey: string | null; paidThrough: Date | null };

/** Owners and admins of every workspace on the account, once each, with the workspace to link to. */
async function notifyAccount(accountId: string, title: (wsName: string) => string, body: string, reason: string): Promise<number> {
  const { createNotification, NOTIFICATION_TYPES } = await import("@/lib/notifications");
  const workspaces = await prisma.workspace.findMany({
    where: { billingAccountId: accountId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true, members: { where: { role: { in: [...MANAGER_ROLES] as string[] } }, select: { userId: true } } },
  });
  const seen = new Set<string>();
  let n = 0;
  for (const ws of workspaces) {
    for (const m of ws.members) {
      if (seen.has(m.userId)) continue;
      seen.add(m.userId);
      try {
        await createNotification({
          userId: m.userId,
          type: NOTIFICATION_TYPES.AI_CREDITS_LOW, // the billing-nudge type, as the other billing sweeps use
          title: title(workspaces.length > 1 ? "Your workspaces" : ws.name),
          body,
          href: `/w/${ws.slug}/billing`,
          payload: { workspaceId: ws.id, billingAccountId: accountId, reason },
        });
        n++;
      } catch (err) {
        console.error("[account-plans] notify failed:", err);
      }
    }
  }
  return n;
}

async function run() {
  const now = new Date();
  let reminded = 0;
  let lapsed = 0;
  let notified = 0;
  let creditRuns = 0;
  let granted = 0;
  let expired = 0;

  const ending: Account[] = await prisma.billingAccount.findMany({
    where: { planKey: { not: null }, reminderAt: null, paidThrough: { gt: now, lte: new Date(now.getTime() + PREPAID_REMINDER_DAYS * DAY_MS) } },
    select: { id: true, planKey: true, paidThrough: true },
    take: MAX_BATCH,
  });
  for (const a of ending) {
    const claimed = await prisma.billingAccount.updateMany({ where: { id: a.id, reminderAt: null }, data: { reminderAt: now } });
    if (!claimed.count || !a.paidThrough) continue;
    reminded++;
    const name = isSelfServePlan(a.planKey) ? CATALOG_PLANS[a.planKey].name : "Your plan";
    notified += await notifyAccount(
      a.id,
      (ws) => `${ws}: ${name} ends on ${fmt(a.paidThrough as Date)}`,
      "Renew from Billing to keep AI screening and your seats.",
      "plan-ending",
    );
  }

  // Paid-until passed and some workspace still shows the plan.
  const gone: Account[] = await prisma.billingAccount.findMany({
    where: { planKey: { not: null }, paidThrough: { lte: now }, workspaces: { some: { planName: { not: "FREE" }, stripeSubscriptionId: null } } },
    select: { id: true, planKey: true, paidThrough: true },
    take: MAX_BATCH,
  });
  for (const a of gone) {
    const moved = await prisma.workspace.findMany({ where: { billingAccountId: a.id, stripeSubscriptionId: null, planName: { not: "FREE" } }, select: { id: true, planName: true } });
    // The sync reads the account again, so a payment landing mid-sweep wins.
    const changed = await syncAccountWorkspaces(a.id, now);
    const still = await prisma.billingAccount.findUnique({ where: { id: a.id }, select: { paidThrough: true } });
    if (!changed || (still?.paidThrough && still.paidThrough > now)) continue;
    lapsed++;
    const name = isSelfServePlan(a.planKey) ? CATALOG_PLANS[a.planKey].name : "Plan";
    for (const ws of moved) {
      await writeWorkspaceAuditEntry({
        workspaceId: ws.id,
        action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
        targetType: "workspace",
        targetId: ws.id,
        meta: { from: name, to: "Free", paidThrough: a.paidThrough?.toISOString() ?? null, billingAccountId: a.id, source: "auto:account-plan" },
      });
    }
    notified += await notifyAccount(
      a.id,
      (ws) => `${ws}: back on Free`,
      `The ${name} period you paid for has ended. Nothing is deleted. Renew from Billing to turn AI screening back on.`,
      "plan-expired",
    );
  }

  const due = await prisma.billingAccount.findMany({
    where: { OR: [{ planKey: { not: null }, paidThrough: { gt: now } }, { planCreditsLeft: { gt: 0 } }] },
    select: { id: true },
    take: 1000,
  });
  for (const a of due) {
    try {
      const r = await runPlanCreditsIfDue(a.id, now);
      if (!r.ran) continue;
      creditRuns++;
      granted += r.granted;
      expired += r.expired;
    } catch (err) {
      console.error(`[account-plans] plan credits for ${a.id} failed:`, err);
    }
  }

  return NextResponse.json({ ok: true, reminded, lapsed, notified, creditRuns, granted, expired, ranAt: now.toISOString() });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("account-plans", run);
export const GET = POST;
