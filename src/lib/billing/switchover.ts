/**
 * Moving existing workspaces onto the new plans (Basic, Growth, Teams).
 *
 * An admin starts it from Admin > Pricing once the new plans are on sale.
 * That sets the switch-over date SWITCHOVER_NOTICE_DAYS ahead, and every
 * workspace still on the old pricing gets notice:
 *
 *   free     Free, Starter without a subscription, or a trial: on the date it
 *            pauses until a plan is chosen. Nothing is deleted.
 *   stripe   Paying per seat through Stripe: on the date the subscription is
 *            set to end at its current period end (never cut short); then the
 *            workspace picks a new plan.
 *   prepaid  Growth paid ahead through Razorpay: runs to its end date, then
 *            picks a new plan. It cannot be renewed on the old pricing after
 *            the switch-over date.
 *
 * Workspaces on a new plan, a pilot or Enterprise are left alone.
 *
 * Paused ("PAUSED" in planName) means: the team can sign in, see and export
 * everything, but cannot send take-homes, schedule interviews or start AI
 * screenings until they buy a plan (which overwrites planName).
 *
 * Pure: no database, no env.
 */
import { isPilot } from "./pilot";
import { prepaidActive, type PlanFields } from "./trial";

export const SWITCHOVER_NOTICE_DAYS = 30;
export const PAUSED_PLAN = "PAUSED";

export type SwitchoverGroup = "free" | "stripe" | "prepaid" | "none";

export type SwitchoverFields = PlanFields & {
  /** The billing account holds one of the new plans (active or not). */
  accountPlanKey?: string | null;
};

const DAY_MS = 86_400_000;

export function switchoverDate(startedAt: Date): Date {
  return new Date(startedAt.getTime() + SWITCHOVER_NOTICE_DAYS * DAY_MS);
}

/** Which notice a workspace gets, if any. */
export function switchoverGroup(ws: SwitchoverFields, now: Date = new Date()): SwitchoverGroup {
  if (ws.planName === "ENTERPRISE" || ws.planName === PAUSED_PLAN) return "none";
  if (ws.accountPlanKey) return "none";
  if (ws.stripeSubscriptionId) return "stripe";
  if (isPilot(ws)) return "none";
  if (prepaidActive(ws, now)) return "prepaid";
  return "free";
}

export function isPaused(planName: string | null | undefined): boolean {
  return planName === PAUSED_PLAN;
}

/**
 * Whether the sweep should pause this workspace now: the switch-over date has
 * passed and nothing pays for it (no Stripe subscription, no paid-up
 * prepaid or account plan, no pilot, not Enterprise).
 */
export function shouldPause(ws: SwitchoverFields, switchoverAt: Date | null, now: Date = new Date()): boolean {
  if (!switchoverAt || now.getTime() < switchoverAt.getTime()) return false;
  if (ws.planName === "ENTERPRISE" || ws.planName === PAUSED_PLAN) return false;
  if (ws.stripeSubscriptionId) return false;
  if (prepaidActive(ws, now)) return false; // includes mirrored account plans
  if (isPilot(ws) && ws.prepaidThrough && new Date(ws.prepaidThrough).getTime() > now.getTime()) return false;
  return true;
}

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The notice for each group, in plain words; the same text goes by email and in the app. */
export function switchoverNotice(group: Exclude<SwitchoverGroup, "none">, workspaceName: string, at: Date, prepaidThrough?: Date | null): { title: string; body: string } {
  const date = fmt(at);
  switch (group) {
    case "free":
      return {
        title: `${workspaceName}: the Free plan ends on ${date}`,
        body: `We are replacing the Free plan and trials with flat monthly plans from $20, each with AI screening credits. From ${date}, ${workspaceName} pauses until you choose a plan: you can still sign in and see everything, but cannot send new take-homes or interviews. Nothing is deleted. Choose a plan on Billing, or book a demo for a free pilot.`,
      };
    case "stripe":
      return {
        title: `${workspaceName}: your plan is changing`,
        body: `We are moving to flat monthly plans with AI screening credits included. Your per-seat subscription keeps running until its current period ends after ${date}, and is not cut short. It then ends instead of renewing, and you choose Basic, Growth or Teams on Billing. You will not be charged the old price again after that period.`,
      };
    case "prepaid":
      return {
        title: `${workspaceName}: your plan is changing`,
        body: `We are moving to flat monthly plans with AI screening credits included. The Growth you paid for runs to ${prepaidThrough ? fmt(prepaidThrough) : "its end date"} as it is. After that, choose Basic, Growth or Teams on Billing; Growth by the seat can no longer be renewed after ${date}.`,
      };
  }
}
