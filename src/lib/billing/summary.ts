/**
 * What the Billing page says about the current plan. Pure, so the heading
 * rules are unit-tested instead of living as ternaries in a component.
 */
import { effectivePlan, trialActive, type PlanFields, TRIAL_SEAT_LIMIT, FREE_SEAT_LIMIT, TRIAL_DURATION_DAYS } from "./trial";
import { WORKSPACE_PLANS, formatUsd, planConfig } from "./plans";

const DAY_MS = 86_400_000;

export type PlanSummary = {
  /** Heading on the plan card: "Trial of Growth", "Growth", "Enterprise", "Free". */
  heading: string;
  body: string;
  /** Whole days left on an active trial, else null. */
  trialDaysLeft: number | null;
  /** Share of the trial used, 0..1, else null. */
  trialUsed: number | null;
  /** Plan column to highlight in the comparison table. */
  compareKey: "FREE" | "GROWTH" | "ENTERPRISE" | null;
  /** Line under the seat meter. */
  seatHint: string;
};

const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function planSummary(ws: PlanFields, now: Date = new Date(), trialDays = TRIAL_DURATION_DAYS): PlanSummary {
  const eff = effectivePlan(ws, now);
  const growth = WORKSPACE_PLANS.GROWTH.price;
  const growthPrice = growth.kind === "per_seat" ? formatUsd(growth.monthlyCents) : null;

  if (trialActive(ws, now) && eff.trialEndsAt) {
    const days = Math.max(1, Math.ceil((eff.trialEndsAt.getTime() - now.getTime()) / DAY_MS));
    return {
      heading: "Trial of Growth",
      body: `Everything in Growth until ${fmtDay(eff.trialEndsAt)}. After that the workspace drops to Free unless you choose a plan.`,
      trialDaysLeft: days,
      trialUsed: Math.min(1, Math.max(0, 1 - days / trialDays)),
      compareKey: "GROWTH",
      seatHint: `Trials allow ${TRIAL_SEAT_LIMIT} seats. Free allows ${FREE_SEAT_LIMIT}.`,
    };
  }

  const base = { trialDaysLeft: null, trialUsed: null };
  switch (ws.planName) {
    case "ENTERPRISE":
      return {
        ...base,
        heading: "Enterprise",
        body: "Your plan is set by your contract. Talk to us to change seats or terms.",
        compareKey: "ENTERPRISE",
        seatHint: "Add as many people as you need.",
      };
    case "GROWTH":
      return {
        ...base,
        heading: "Growth",
        body: "AI screening, ATS sync, API keys and external tools are on. Billed per seat each month.",
        compareKey: "GROWTH",
        seatHint: growthPrice ? `Billed per seat at ${growthPrice} a month.` : "Billed per seat.",
      };
    case "STARTER":
      return {
        ...base,
        heading: "Starter",
        body: "A paid plan billed per seat. AI screening and connections need Growth.",
        compareKey: null,
        seatHint: "Billed per seat.",
      };
    case "LOCKED":
      return {
        ...base,
        heading: "Locked",
        body: "This workspace is locked. Choose a plan or talk to us to unlock it.",
        compareKey: null,
        seatHint: `Free allows ${FREE_SEAT_LIMIT} seats.`,
      };
    default: {
      const ended = ws.trialEndsAt && !ws.stripeSubscriptionId;
      return {
        ...base,
        heading: planConfig(ws.planName).name,
        body: ended
          ? "Your trial has ended. Take homes, interviews and the question library still work. AI screening and connections need Growth."
          : "Take homes, interviews and the question library. AI screening and connections need Growth.",
        compareKey: ws.stripeSubscriptionId ? null : "FREE",
        seatHint: ws.stripeSubscriptionId ? "Billed per seat." : `Free allows ${FREE_SEAT_LIMIT} seats.`,
      };
    }
  }
}
