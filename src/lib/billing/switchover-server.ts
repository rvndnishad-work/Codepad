/**
 * Server side of the move to the new plans (rules in ./switchover): the
 * switch-over date, and the sweep that sends notice, ends Stripe
 * subscriptions at their period end, and pauses workspaces nothing pays for.
 */
import { prisma } from "@/lib/prisma";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { newPlansEnabled } from "./account-plan-server";
import { PAUSED_PLAN, shouldPause, switchoverDate, switchoverGroup, switchoverNotice } from "./switchover";

export const SWITCHOVER_SETTING = "plans_switchover_at";

/** The switch-over date, or null while it has not been started. */
export async function getSwitchoverAt(): Promise<Date | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: SWITCHOVER_SETTING } });
    const d = row?.value ? new Date(row.value) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/** True once the switch-over has been started (notice period or after). */
export async function switchoverStarted(): Promise<boolean> {
  return (await getSwitchoverAt()) !== null;
}

/** Old per-seat pricing can no longer be bought once the date has passed. */
export async function oldPricingClosed(now: Date = new Date()): Promise<boolean> {
  const at = await getSwitchoverAt();
  return Boolean(at && now.getTime() >= at.getTime());
}

export type SwitchoverStartResult = { ok: true; at: Date } | { ok: false; error: string };

/** Starts the notice period. Needs the new plans on sale; never moves a date already set. */
export async function startSwitchover(now: Date = new Date()): Promise<SwitchoverStartResult> {
  if (!(await newPlansEnabled())) return { ok: false, error: "Put the new plans on sale first, so workspaces can choose one during the notice period." };
  const existing = await getSwitchoverAt();
  if (existing) return { ok: false, error: `The move is already set for ${existing.toISOString().slice(0, 10)}.` };
  const at = switchoverDate(now);
  await prisma.siteSetting.create({ data: { key: SWITCHOVER_SETTING, value: at.toISOString() } });
  return { ok: true, at };
}

/**
 * Calls the move off before its date. Notices already sent stay sent, so the
 * admin should tell those customers; after the date nothing is undone here.
 */
export async function cancelSwitchover(now: Date = new Date()): Promise<SwitchoverStartResult> {
  const at = await getSwitchoverAt();
  if (!at) return { ok: false, error: "The move has not been started." };
  if (now.getTime() >= at.getTime()) return { ok: false, error: "The switch-over date has passed, so it cannot be called off here." };
  await prisma.siteSetting.delete({ where: { key: SWITCHOVER_SETTING } });
  await prisma.workspace.updateMany({ where: { switchoverNoticeAt: { not: null } }, data: { switchoverNoticeAt: null } });
  return { ok: true, at };
}

const BATCH = 200;
const wsSelect = {
  id: true,
  name: true,
  slug: true,
  planName: true,
  trialEndsAt: true,
  stripeSubscriptionId: true,
  stripeStatus: true,
  prepaidThrough: true,
  prepaidSeats: true,
  prepaidCadence: true,
  billingAccount: { select: { planKey: true } },
  members: { where: { role: { in: [...MANAGER_ROLES] as string[] } }, select: { userId: true, user: { select: { name: true, email: true } } } },
} as const;

async function tell(
  ws: { id: string; name: string; slug: string; members: { userId: string; user: { name: string | null; email: string | null } }[] },
  title: string,
  body: string,
  reason: string,
  emailToo: boolean,
): Promise<number> {
  const { createNotification, NOTIFICATION_TYPES } = await import("@/lib/notifications");
  const { appOrigin } = await import("@/lib/interview/links");
  const origin = await appOrigin();
  let n = 0;
  for (const m of ws.members) {
    try {
      await createNotification({
        userId: m.userId,
        type: NOTIFICATION_TYPES.AI_CREDITS_LOW, // the billing-nudge type, as the other billing sweeps use
        title,
        body,
        href: `/w/${ws.slug}/billing`,
        payload: { workspaceId: ws.id, reason },
      });
      n++;
    } catch (err) {
      console.error("[switchover] notify failed:", err);
    }
    if (emailToo && m.user.email) {
      try {
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          template: "plan-change-notice",
          to: m.user.email,
          props: { recipientName: m.user.name || "there", workspaceName: ws.name, title, body, billingUrl: `${origin}/w/${ws.slug}/billing`, demoUrl: `${origin}/demo?source=plan-change` },
          workspaceId: ws.id,
          idempotencyKey: `${reason}:${ws.id}:${m.user.email}`,
        });
      } catch (err) {
        console.error("[switchover] email failed:", err);
      }
    }
  }
  return n;
}

export type SwitchoverSweep = { at: string | null; noticed: number; cancelled: number; paused: number; errors: number };

/** The hourly step. Does nothing until the move is started. */
export async function runSwitchover(now: Date = new Date()): Promise<SwitchoverSweep> {
  const out: SwitchoverSweep = { at: null, noticed: 0, cancelled: 0, paused: 0, errors: 0 };
  const at = await getSwitchoverAt();
  if (!at) return out;
  out.at = at.toISOString();

  // 1. Notice, once per workspace, to every workspace still on the old pricing.
  const unnoticed = await prisma.workspace.findMany({
    where: { switchoverNoticeAt: null, planName: { notIn: ["ENTERPRISE", PAUSED_PLAN] }, deletionScheduledAt: null },
    select: wsSelect,
    take: BATCH,
    orderBy: { createdAt: "asc" },
  });
  for (const ws of unnoticed) {
    const group = switchoverGroup({ ...ws, accountPlanKey: ws.billingAccount?.planKey }, now);
    const claimed = await prisma.workspace.updateMany({ where: { id: ws.id, switchoverNoticeAt: null }, data: { switchoverNoticeAt: now } });
    if (!claimed.count || group === "none") continue;
    const notice = switchoverNotice(group, ws.name, at, ws.prepaidThrough);
    await tell(ws, notice.title, notice.body, `switchover-${group}`, true);
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
      targetType: "workspace",
      targetId: ws.id,
      meta: { notice: group, switchoverAt: at.toISOString(), source: "auto:switchover" },
    });
    out.noticed++;
  }

  if (now.getTime() < at.getTime()) return out;

  // 2. Stripe: end each per-seat subscription at its current period end.
  const subs = await prisma.workspace.findMany({
    where: { stripeSubscriptionId: { not: null }, switchoverCancelAt: null, planName: { not: "ENTERPRISE" } },
    select: { id: true, stripeSubscriptionId: true },
    take: BATCH,
  });
  if (subs.length) {
    const { getStripe } = await import("@/lib/stripe");
    for (const ws of subs) {
      try {
        await getStripe().subscriptions.update(ws.stripeSubscriptionId as string, { cancel_at_period_end: true });
        await prisma.workspace.update({ where: { id: ws.id }, data: { switchoverCancelAt: now } });
        await writeWorkspaceAuditEntry({
          workspaceId: ws.id,
          action: WORKSPACE_AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED,
          targetType: "workspace",
          targetId: ws.id,
          meta: { atPeriodEnd: true, subscriptionId: ws.stripeSubscriptionId, source: "auto:switchover" },
        });
        out.cancelled++;
      } catch (err) {
        out.errors++;
        console.error(`[switchover] could not set ${ws.stripeSubscriptionId} to end at period end:`, err);
      }
    }
  }

  // 3. Pause what nothing pays for. Data stays; buying a plan wakes it.
  const candidates = await prisma.workspace.findMany({
    where: { planName: { notIn: ["ENTERPRISE", PAUSED_PLAN] }, stripeSubscriptionId: null, deletionScheduledAt: null },
    select: wsSelect,
    take: 1000,
  });
  for (const ws of candidates) {
    if (!shouldPause({ ...ws, accountPlanKey: ws.billingAccount?.planKey }, at, now)) continue;
    // Guarded on the fields read, so a payment landing mid-sweep wins.
    const claimed = await prisma.workspace.updateMany({
      where: { id: ws.id, planName: ws.planName, stripeSubscriptionId: null, prepaidThrough: ws.prepaidThrough },
      data: { planName: PAUSED_PLAN, trialEndsAt: null },
    });
    if (!claimed.count) continue;
    out.paused++;
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
      targetType: "workspace",
      targetId: ws.id,
      meta: { from: ws.planName, to: "Paused", source: "auto:switchover" },
    });
    await tell(
      ws,
      `${ws.name} is paused until you choose a plan`,
      "Your candidates, results and settings are all here. Choose Basic, Growth or Teams on Billing to send take-homes, interviews and AI screenings again.",
      "switchover-paused",
      false,
    );
  }
  return out;
}

export const PAUSED_MESSAGE = "This workspace is paused until you choose a plan on Billing. Your candidates and results are all still here.";

/** True when the workspace is paused (see ./switchover). Unknown ids are not paused. */
export async function workspaceIsPaused(workspaceId: string | null | undefined): Promise<boolean> {
  if (!workspaceId) return false;
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { planName: true } });
  return ws?.planName === PAUSED_PLAN;
}

/** For Admin > Pricing: how many workspaces are in each group today. */
export async function switchoverCounts(now: Date = new Date()) {
  const rows = await prisma.workspace.findMany({
    where: { planName: { not: "ENTERPRISE" }, deletionScheduledAt: null },
    select: {
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      prepaidThrough: true,
      prepaidSeats: true,
      prepaidCadence: true,
      switchoverNoticeAt: true,
      billingAccount: { select: { planKey: true } },
    },
  });
  const counts = { free: 0, stripe: 0, prepaid: 0, noticed: 0, paused: 0 };
  for (const ws of rows) {
    if (ws.planName === PAUSED_PLAN) counts.paused++;
    if (ws.switchoverNoticeAt) counts.noticed++;
    const g = switchoverGroup({ ...ws, accountPlanKey: ws.billingAccount?.planKey }, now);
    if (g !== "none") counts[g]++;
  }
  return counts;
}
