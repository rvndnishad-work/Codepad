import { describe, expect, it } from "vitest";
import { payoutRowFromEvent } from "./payouts";

describe("payoutRowFromEvent", () => {
  it("maps a connected-account payout", () => {
    const row = payoutRowFromEvent({
      type: "payout.paid",
      account: "acct_1",
      data: { object: { id: "po_1", amount: 1250, currency: "USD", status: "in_transit", arrival_date: 1_790_000_000, failure_message: null } },
    });
    expect(row).toMatchObject({ stripeId: "po_1", stripeAccountId: "acct_1", kind: "payout", amountCents: 1250, currency: "usd", status: "paid" });
    expect(row?.arrivalDate?.getTime()).toBe(1_790_000_000_000);
  });

  it("marks failed payouts and keeps the message", () => {
    const row = payoutRowFromEvent({
      type: "payout.failed",
      account: "acct_1",
      data: { object: { id: "po_2", amount: 500, currency: "usd", status: "failed", failure_message: "Bank closed" } },
    });
    expect(row).toMatchObject({ status: "failed", failureMessage: "Bank closed" });
  });

  it("ignores payouts of the platform balance", () => {
    expect(payoutRowFromEvent({ type: "payout.created", data: { object: { id: "po_3", amount: 1, currency: "usd", status: "pending" } } })).toBeNull();
  });

  it("maps transfers by destination and handles reversals", () => {
    const created = payoutRowFromEvent({
      type: "transfer.created",
      data: { object: { id: "tr_1", amount: 900, currency: "usd", destination: "acct_9", reversed: false, amount_reversed: 0 } },
    });
    expect(created).toMatchObject({ stripeId: "tr_1", stripeAccountId: "acct_9", kind: "transfer", status: "paid", amountCents: 900 });

    const partial = payoutRowFromEvent({
      type: "transfer.reversed",
      data: { object: { id: "tr_1", amount: 900, currency: "usd", destination: { id: "acct_9" }, reversed: false, amount_reversed: 400 } },
    });
    expect(partial).toMatchObject({ status: "paid", amountCents: 500 });

    const full = payoutRowFromEvent({
      type: "transfer.reversed",
      data: { object: { id: "tr_1", amount: 900, currency: "usd", destination: "acct_9", reversed: true, amount_reversed: 900 } },
    });
    expect(full).toMatchObject({ status: "canceled", amountCents: 900 });
  });

  it("returns null for other events", () => {
    expect(payoutRowFromEvent({ type: "invoice.paid", data: { object: {} } })).toBeNull();
  });
});
