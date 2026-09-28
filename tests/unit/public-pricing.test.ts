import { describe, expect, it } from "vitest";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credit-packs";
import { AI_ENGAGEMENT_CREDIT_COST } from "@/lib/ai-interview/engagement";
import { PLAN_ORDER, WORKSPACE_PLANS, checkoutSeatPriceCents, formatUsd } from "@/lib/billing/plans";
import {
  ANNUAL_SAVING_PERCENT,
  LOWEST_CREDIT_PRICE,
  PUBLIC_COMPARISON,
  PUBLIC_CREDIT_PACKS,
  PUBLIC_PLANS,
  PUBLIC_PRICING_FAQ,
  SCREENING_CREDIT_COSTS,
} from "@/lib/billing/public-pricing";

describe("public pricing matches what checkout charges", () => {
  it("lists every workspace plan, in order", () => {
    expect(PUBLIC_PLANS.map((p) => p.key)).toEqual(PLAN_ORDER);
  });

  it("shows the Growth seat price Stripe checkout uses", () => {
    const growth = PUBLIC_PLANS.find((p) => p.key === "GROWTH")!;
    expect(growth.price.monthly).toBe(formatUsd(checkoutSeatPriceCents("GROWTH", "monthly")));
    expect(growth.price.annual).toBe(formatUsd(checkoutSeatPriceCents("GROWTH", "annual")));
    expect(growth.cta).toBe("checkout");
    expect(growth.recommended).toBe(true);
  });

  it("only Growth starts a checkout", () => {
    expect(PUBLIC_PLANS.filter((p) => p.cta === "checkout").map((p) => p.key)).toEqual(["GROWTH"]);
  });

  it("states the Free seat cap from the plan config", () => {
    const free = PUBLIC_PLANS.find((p) => p.key === "FREE")!;
    expect(free.seats).toContain(String(WORKSPACE_PLANS.FREE.seatLimit));
  });

  it("computes the yearly saving", () => {
    const g = WORKSPACE_PLANS.GROWTH.price;
    if (g.kind !== "per_seat") throw new Error("Growth must be per seat");
    expect(ANNUAL_SAVING_PERCENT).toBe(Math.round((1 - g.annualMonthlyCents / g.monthlyCents) * 100));
  });

  it("prices credit packs from the pack config", () => {
    expect(PUBLIC_CREDIT_PACKS).toHaveLength(AI_CREDIT_PACKS.length);
    PUBLIC_CREDIT_PACKS.forEach((p, i) => {
      const src = AI_CREDIT_PACKS[i];
      expect(p.credits).toBe(src.credits);
      expect(p.price).toBe(formatUsd(src.priceCents));
      expect(p.perCredit).toBe(`$${(src.priceCents / src.credits / 100).toFixed(2)}`);
    });
  });

  it("names the cheapest credit price", () => {
    const low = Math.min(...AI_CREDIT_PACKS.map((p) => p.priceCents / p.credits / 100));
    expect(LOWEST_CREDIT_PRICE).toBe(`$${low.toFixed(2)}`);
  });

  it("lists the credit cost of every interviewer presence level", () => {
    expect(SCREENING_CREDIT_COSTS.map((c) => c.credits)).toEqual(Object.values(AI_ENGAGEMENT_CREDIT_COST));
  });

  it("has three cells per comparison row", () => {
    for (const row of PUBLIC_COMPARISON) expect(row.cells).toHaveLength(PLAN_ORDER.length);
  });

  it("claims no certification we do not hold", () => {
    const text = JSON.stringify([PUBLIC_PLANS, PUBLIC_COMPARISON, PUBLIC_PRICING_FAQ]);
    expect(text).not.toMatch(/SOC ?2|ISO ?27001|HIPAA/i);
  });
});
