import { describe, expect, it } from "vitest";
import {
  monthlyCents,
  nextPastDueSince,
  snapshotFromSubscription,
  snapshotWithoutSubscription,
  subscriptionMrrCents,
  type RecurringItemLike,
} from "./stripe-sync";

const seat = (unit: number, qty: number, interval = "month", count = 1, periodEnd = 1_800_000_000): RecurringItemLike => ({
  id: "si_seat",
  quantity: qty,
  current_period_end: periodEnd,
  price: { unit_amount: unit, recurring: { interval, interval_count: count } },
});
const video = (unit: number, interval = "month"): RecurringItemLike => ({
  id: "si_video",
  quantity: 1,
  metadata: { kind: "video_addon" },
  price: { unit_amount: unit, recurring: { interval, interval_count: 1 } },
});

describe("monthlyCents", () => {
  it("keeps monthly as is and divides yearly by 12", () => {
    expect(monthlyCents(4900, "month")).toBe(4900);
    expect(monthlyCents(18000, "year")).toBe(1500);
  });
  it("honours interval_count", () => {
    expect(monthlyCents(3000, "month", 3)).toBe(1000);
    expect(monthlyCents(24000, "year", 2)).toBe(1000);
  });
  it("normalises weeks and days", () => {
    expect(monthlyCents(1200, "week")).toBe(5200);
    expect(monthlyCents(1200, "day")).toBe(36500);
  });
  it("ignores unknown intervals", () => {
    expect(monthlyCents(1000, "fortnight")).toBe(0);
  });
});

describe("subscriptionMrrCents", () => {
  it("sums seats × quantity and the video add-on", () => {
    expect(subscriptionMrrCents([seat(4900, 5), video(1500)])).toBe(5 * 4900 + 1500);
  });
  it("normalises an annual subscription", () => {
    // 12 seats at $180/yr + $180/yr video = $2,340/yr = $195/month
    expect(subscriptionMrrCents([seat(18000, 12, "year"), video(18000, "year")])).toBe(19500);
  });
  it("skips items without a recurring price and uses unit_amount_decimal", () => {
    expect(
      subscriptionMrrCents([
        { id: "x", quantity: 1, price: { unit_amount: 999 } },
        { id: "y", quantity: 2, price: { unit_amount: null, unit_amount_decimal: "250.5", recurring: { interval: "month" } } },
      ]),
    ).toBe(501);
  });
  it("defaults quantity to 1", () => {
    expect(subscriptionMrrCents([{ id: "z", price: { unit_amount: 700, recurring: { interval: "month" } } }])).toBe(700);
  });
});

describe("nextPastDueSince", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  const before = new Date("2026-09-29T00:00:00Z");
  it("stamps now when turning past_due", () => expect(nextPastDueSince("past_due", null, now)).toEqual(now));
  it("keeps the first date while still past_due", () => expect(nextPastDueSince("past_due", before, now)).toEqual(before));
  it("clears otherwise", () => {
    expect(nextPastDueSince("active", before, now)).toBeNull();
    expect(nextPastDueSince(null, before, now)).toBeNull();
  });
});

describe("snapshotFromSubscription", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  it("reads seats from the seat item even when video is listed first", () => {
    const s = snapshotFromSubscription({ status: "active", items: { data: [video(1500), seat(4900, 7)] } }, null, now);
    expect(s.stripeSeatQuantity).toBe(7);
    expect(s.stripeMrrCents).toBe(7 * 4900 + 1500);
    expect(s.stripeInterval).toBe("month");
    expect(s.stripeCurrentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
    expect(s.stripePastDueSince).toBeNull();
    expect(s.stripeSyncedAt).toEqual(now);
  });
  it("bills nothing once cancelled", () => {
    const s = snapshotFromSubscription({ status: "canceled", items: { data: [seat(4900, 3)] } }, null, now);
    expect(s.stripeMrrCents).toBe(0);
    expect(s.stripeStatus).toBe("canceled");
  });
  it("stamps past due", () => {
    const s = snapshotFromSubscription({ status: "past_due", items: { data: [seat(4900, 3)] } }, null, now);
    expect(s.stripePastDueSince).toEqual(now);
    expect(s.stripeMrrCents).toBe(14700);
  });
});

describe("snapshotWithoutSubscription", () => {
  it("marks a former subscriber canceled with zero MRR", () => {
    const s = snapshotWithoutSubscription("active");
    expect(s.stripeStatus).toBe("canceled");
    expect(s.stripeMrrCents).toBe(0);
  });
  it("leaves never-subscribed workspaces null", () => {
    const s = snapshotWithoutSubscription(null);
    expect(s.stripeStatus).toBeNull();
    expect(s.stripeMrrCents).toBeNull();
  });
});
