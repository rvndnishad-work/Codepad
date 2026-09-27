import { describe, expect, it } from "vitest";
import {
  ledgerCsv,
  ledgerDetail,
  ledgerViews,
  lowCreditDecision,
  subscriptionUpdateAudits,
  usageByMonth,
  usageMonths,
} from "@/lib/billing/usage";

const now = new Date("2026-09-27T12:00:00Z");

describe("credit history", () => {
  const rows = [
    { id: "3", kind: "CONSUMPTION", amount: -2, createdAt: "2026-09-20T10:00:00Z", note: null, candidateName: "Ana Lopez" },
    { id: "2", kind: "PURCHASE", amount: 50, createdAt: "2026-09-10T10:00:00Z", note: "Stripe checkout cs_1 — pack team-50" },
    { id: "1", kind: "GRANT", amount: 5, createdAt: "2026-08-01T10:00:00Z", note: "Welcome credits" },
  ];

  it("labels rows and works out the balance after each one", () => {
    const views = ledgerViews(rows, 53);
    expect(views.map((v) => [v.label, v.detail, v.balanceAfter])).toEqual([
      ["Used", "AI screening with Ana Lopez", 53],
      ["Bought", "Team pack", 55],
      ["Added by Interviewpad", "Welcome credits", 5],
    ]);
  });

  it("starts later pages from the balance before the newer rows", () => {
    expect(ledgerViews(rows.slice(1), 53, -2)[0].balanceAfter).toBe(55);
  });

  it("writes a CSV that spreadsheets cannot run", () => {
    const csv = ledgerCsv(ledgerViews([{ id: "x", kind: "GRANT", amount: 1, createdAt: "2026-09-01T08:05:00Z", note: '=HYPERLINK("x"), hi' }], 1));
    expect(csv).toBe('Date (UTC),Type,Credits,Balance after,Details\r\n2026-09-01 08:05,Added by Interviewpad,1,1,"\'=HYPERLINK(""x""), hi"\r\n');
  });

  it("keeps Stripe ids out of the details", () => {
    expect(ledgerDetail({ id: "p", kind: "PURCHASE", amount: 10, createdAt: now, note: "Stripe checkout cs_live_abc" })).toBe("Credit pack");
  });
});

describe("six-month usage", () => {
  it("lists the last six months, oldest first", () => {
    const months = usageMonths(now);
    expect(months.map((m) => m.key)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
    expect(months[5].label).toBe("Sep");
  });

  it("counts sends and credits per month and ignores older data", () => {
    const usage = usageByMonth(usageMonths(now), {
      takeHomes: ["2026-09-01T00:00:00Z", "2026-03-31T23:59:00Z"],
      aiScreenings: ["2026-08-15T00:00:00Z"],
      interviews: ["2026-09-02T00:00:00Z", "2026-09-03T00:00:00Z"],
      ledger: [
        { kind: "CONSUMPTION", amount: -3, createdAt: "2026-09-05T00:00:00Z" },
        { kind: "REFUND", amount: 1, createdAt: "2026-09-06T00:00:00Z" },
        { kind: "PURCHASE", amount: 50, createdAt: "2026-08-06T00:00:00Z" },
      ],
    });
    expect(usage[5]).toMatchObject({ takeHomes: 1, interviews: 2, creditsUsed: 2, creditsBought: 0 });
    expect(usage[4]).toMatchObject({ aiScreenings: 1, creditsBought: 50 });
    expect(usage[0].takeHomes).toBe(0);
  });
});

describe("low-credit email", () => {
  it("sends once per dip below the threshold", () => {
    expect(lowCreditDecision({ threshold: 10, alertedAt: null }, 9)).toBe("send");
    expect(lowCreditDecision({ threshold: 10, alertedAt: now }, 3)).toBe("none");
    expect(lowCreditDecision({ threshold: 10, alertedAt: null }, 10)).toBe("none");
  });

  it("clears the stamp once the balance recovers or the email is turned off", () => {
    expect(lowCreditDecision({ threshold: 10, alertedAt: now }, 60)).toBe("clear");
    expect(lowCreditDecision({ threshold: null, alertedAt: now }, 0)).toBe("clear");
    expect(lowCreditDecision({ threshold: null, alertedAt: null }, 0)).toBe("none");
  });
});

describe("subscription updates", () => {
  it("records a plan change with readable names", () => {
    expect(subscriptionUpdateAudits({ fromPlan: "GROWTH", toPlan: "FREE", cancelAtPeriodEnd: false })).toEqual([
      { action: "PLAN_CHANGED", meta: { from: "Growth", to: "Free", source: "stripe" } },
    ]);
  });

  it("records a cancellation booked for the period end only when it was just booked", () => {
    expect(subscriptionUpdateAudits({ fromPlan: "GROWTH", toPlan: "GROWTH", cancelAtPeriodEnd: true, previousCancelAtPeriodEnd: false })).toEqual([
      { action: "SUBSCRIPTION_CANCELLED", meta: { plan: "Growth", atPeriodEnd: true, source: "stripe" } },
    ]);
    expect(subscriptionUpdateAudits({ fromPlan: "GROWTH", toPlan: "GROWTH", cancelAtPeriodEnd: true })).toEqual([]);
  });
});
