import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCronRun } from "@/lib/admin/cron-run";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { PREPAID_REMINDER_DAYS } from "@/lib/billing/prepaid";
import { PILOT_CADENCE, PILOT_REMINDER_DAYS } from "@/lib/billing/pilot";
import { finishPilot } from "@/lib/demo-requests/server";

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
 * Pilots (prepaidCadence "pilot", set up by an admin from a demo request)
 * get their own wording, a reminder PILOT_REMINDER_DAYS before the end, and
 * at the end their unused pilot credits expire (finishPilot). A demo request
 * whose pilot workspace has since paid is marked Converted.
 *
 * Workspaces with a Stripe subscription are never touched, nor are those
 * on a new plan held by their billing account (Basic, Growth, Teams): the
 * account-plans sweep handles those.
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
/** Prisma's `not` skips NULL rows, so spell out "not a pilot". */
const notPilot = { OR: [{ prepaidCadence: null }, { prepaidCadence: { not: PILOT_CADENCE } }] };
/** Old prepaid Growth only: not a workspace mirroring its account's plan. */
const notAccountPlan = { NOT: { billingAccount: { planKey: { not: null } } } };
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function run() {
  const now = new Date();
  let reminded = 0;
  let expired = 0;
  let notified = 0;
  let pilotsReminded = 0;
  let pilotsEnded = 0;
  let converted = 0;

  const ending = await prisma.workspace.findMany({
    where: {
      planName: "GROWTH",
      stripeSubscriptionId: null,
      prepaidReminderAt: null,
      prepaidThrough: { gt: now, lte: new Date(now.getTime() + PREPAID_REMINDER_DAYS * DAY_MS) },
      ...notPilot,
      ...notAccountPlan,
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
    where: { planName: "GROWTH", stripeSubscriptionId: null, prepaidThrough: { not: null, lte: now }, ...notPilot, ...notAccountPlan },
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

  // ── Pilots ──
  const pilotsEnding = await prisma.workspace.findMany({
    where: {
      planName: "GROWTH",
      stripeSubscriptionId: null,
      prepaidCadence: PILOT_CADENCE,
      prepaidReminderAt: null,
      prepaidThrough: { gt: now, lte: new Date(now.getTime() + PILOT_REMINDER_DAYS * DAY_MS) },
    },
    select: { id: true, name: true, slug: true, prepaidThrough: true, members: managers },
    take: MAX_BATCH,
  });
  for (const ws of pilotsEnding) {
    const claimed = await prisma.workspace.updateMany({ where: { id: ws.id, prepaidReminderAt: null }, data: { prepaidReminderAt: now } });
    if (!claimed.count || !ws.prepaidThrough) continue;
    pilotsReminded++;
    notified += await notifyManagers(
      ws,
      `${ws.name}: your pilot ends on ${fmt(ws.prepaidThrough)}`,
      "Pick a plan in Billing to keep screening. Your candidates, results and settings stay as they are.",
      "pilot-ending",
    );
  }

  const pilotsLapsed = await prisma.workspace.findMany({
    where: { planName: "GROWTH", stripeSubscriptionId: null, prepaidCadence: PILOT_CADENCE, prepaidThrough: { not: null, lte: now } },
    select: { id: true, name: true, slug: true, prepaidThrough: true, members: managers },
    take: MAX_BATCH,
  });
  for (const ws of pilotsLapsed) {
    const res = await finishPilot(ws, now, { actor: null, reason: "auto:pilot" });
    if (!res.finished) continue;
    pilotsEnded++;
    await prisma.demoRequestEvent.createMany({
      data: (await prisma.demoRequest.findMany({ where: { workspaceId: ws.id }, select: { id: true } })).map((r) => ({
        requestId: r.id,
        kind: "pilot_ended",
        text: `Pilot ended on its end date${res.expired ? `; ${res.expired} unused pilot credits expired` : ""}`,
      })),
    });
    notified += await notifyManagers(
      ws,
      `${ws.name}: your pilot has ended`,
      "The workspace is on Free now. Nothing is deleted. Pick a plan in Billing to turn AI screening back on.",
      "pilot-ended",
    );
  }

  // Pilot requests whose workspace now pays (Stripe, or a paid prepaid period).
  const paying = await prisma.demoRequest.findMany({
    where: {
      stage: "PILOT",
      workspaceId: { not: null },
    },
    select: { id: true, workspaceId: true },
    take: MAX_BATCH,
  });
  if (paying.length) {
    const ids = paying.map((r) => r.workspaceId as string);
    const paid = await prisma.workspace.findMany({
      where: {
        id: { in: ids },
        OR: [{ stripeSubscriptionId: { not: null } }, { planName: { in: ["BASIC", "GROWTH", "TEAMS"] }, prepaidThrough: { gt: now }, ...notPilot }, { planName: "ENTERPRISE" }],
      },
      select: { id: true },
    });
    const paidIds = new Set(paid.map((w) => w.id));
    for (const r of paying) {
      if (!paidIds.has(r.workspaceId as string)) continue;
      const moved = await prisma.demoRequest.updateMany({ where: { id: r.id, stage: "PILOT" }, data: { stage: "CONVERTED" } });
      if (!moved.count) continue;
      converted++;
      await prisma.demoRequestEvent.create({ data: { requestId: r.id, kind: "stage", text: "Moved from Pilot to Converted: the workspace is on a paid plan" } });
    }
  }

  return NextResponse.json({ ok: true, reminded, expired, notified, pilotsReminded, pilotsEnded, converted, ranAt: now.toISOString() });
}

// Vercel Cron sends GET; POST stays for manual and scheduler calls.
export const POST = withCronRun("prepaid-expiry", run);
export const GET = POST;
