import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronRun } from "@/lib/admin/cron-run";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { PREPAID_REMINDER_DAYS } from "@/lib/billing/prepaid";

/**
 * Prepaid Growth sweep (Razorpay one-time payments), hourly.
 *
 * 1. Reminder: workspaces whose paid-until date is within
 *    PREPAID_REMINDER_DAYS get one "renew soon" notice per period
 *    (prepaidReminderAt stamps it; a new payment clears the stamp).
 * 2. Expiry: workspaces past their paid-until date move back to FREE and their
 *    owners and admins are told. effectivePlan() already treats them as Free
 *    the moment the date passes, so this only makes planName agree. The paid
 *    history (prepaidThrough, prepaidSeats) is kept for Billing to show.
 *
 * Workspaces with a Stripe subscription are never touched.
 */
const MAX_BATCH = 200;
const DAY_MS = 86_400_000;

async function notifyManagers(ws: { id: string; slug: string; members: { userId: string }[] }, title: string, body: string, reason: string) {
  const { createNotification, NOTIFICATION_TYPES } = await import("@/lib/notifications");
  let n = 0;
  for (const m of ws.members) {
    try {
      await createNotification({
        userId: m.userId,
        type: NOTIFICATION_TYPES.AI_CREDITS_LOW, // the billing-nudge type, as the trial sweep uses
        title,
        body,
        href: `/w/${ws.slug}/billing`,
        payload: { workspaceId: ws.id, reason },
      });
      n++;
    } catch (err) {
      console.error("[prepaid-expiry] notify failed:", err);
    }
  }
  return n;
}

const managers = { where: { role: { in: [...MANAGER_ROLES] as string[] } }, select: { userId: true as const } };
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function run() {
  const now = new Date();
  let reminded = 0;
  let expired = 0;
  let notified = 0;

  const ending = await prisma.workspace.findMany({
    where: {
      planName: "GROWTH",
      stripeSubscriptionId: null,
      prepaidReminderAt: null,
      prepaidThrough: { gt: now, lte: new Date(now.getTime() + PREPAID_REMINDER_DAYS * DAY_MS) },
    },
    select: { id: true, name: true, slug: true, prepaidThrough: true, members: managers },
    take: MAX_BATCH,
  });
  for (const ws of ending) {
    const claimed = await prisma.workspace.updateMany({ where: { id: ws.id, prepaidReminderAt: null }, data: { prepaidReminderAt: now } });
    if (!claimed.count || !ws.prepaidThrough) continue;
    reminded++;
    notified += await notifyManagers(
      ws,
      `${ws.name}: Growth ends on ${fmt(ws.prepaidThrough)}`,
      "Renew from Billing to keep AI screening, connections and your seats.",
      "prepaid-ending",
    );
  }

  const lapsed = await prisma.workspace.findMany({
    where: { planName: "GROWTH", stripeSubscriptionId: null, prepaidThrough: { not: null, lte: now } },
    select: { id: true, name: true, slug: true, prepaidThrough: true, members: managers },
    take: MAX_BATCH,
  });
  for (const ws of lapsed) {
    // Guarded on the same paid-until date, so a payment landing mid-sweep wins.
    const claimed = await prisma.workspace.updateMany({
      where: { id: ws.id, planName: "GROWTH", stripeSubscriptionId: null, prepaidThrough: ws.prepaidThrough },
      data: { planName: "FREE" },
    });
    if (!claimed.count) continue;
    expired++;
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
      targetType: "workspace",
      targetId: ws.id,
      meta: { from: "Growth", to: "Free", paidThrough: ws.prepaidThrough?.toISOString() ?? null, source: "auto:prepaid" },
    });
    notified += await notifyManagers(
      ws,
      `${ws.name} is back on Free`,
      "The Growth period you paid for has ended. Renew from Billing to turn AI screening and connections back on.",
      "prepaid-expired",
    );
  }

  return NextResponse.json({ ok: true, reminded, expired, notified, ranAt: now.toISOString() });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("prepaid-expiry", run);
export const GET = POST;
