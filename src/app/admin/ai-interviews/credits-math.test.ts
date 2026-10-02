import { describe, expect, it } from "vitest";
import { adjustError, creditTotals, grantError, includedAfter, kindMeta, refundAmount } from "./credits-math";

describe("creditTotals", () => {
  const rows = [
    { kind: "GRANT", sum: 50, count: 2 },
    { kind: "PURCHASE", sum: 200, count: 1 },
    { kind: "INCLUDED", sum: 40, count: 4 },
    { kind: "TRIAL", sum: 10, count: 1 },
    { kind: "CONSUMPTION", sum: -120, count: 90 },
    { kind: "REFUND", sum: 6, count: 3 },
    { kind: "INCLUDED_EXPIRED", sum: -8, count: 1 },
    { kind: "ADJUSTMENT", sum: -5, count: 1 },
  ];
  it("lifetime granted is grants plus purchases only", () => {
    expect(creditTotals(rows).lifetimeGranted).toBe(250);
  });
  it("balance is the sum of every row, included credits too", () => {
    expect(creditTotals(rows).balance).toBe(50 + 200 + 40 + 10 - 120 + 6 - 8 - 5);
  });
  it("used is net of refunds", () => {
    const t = creditTotals(rows);
    expect(t.used).toBe(114);
    expect(t.included).toBe(50);
    expect(t.expired).toBe(8);
    expect(t.adjusted).toBe(-5);
  });
  it("is all zero for no rows", () => {
    expect(creditTotals([])).toMatchObject({ balance: 0, lifetimeGranted: 0, used: 0 });
  });
});

describe("grant and adjust rules", () => {
  it("grants whole positive numbers up to the cap", () => {
    expect(grantError(5)).toBeNull();
    expect(grantError(0)).not.toBeNull();
    expect(grantError(2.5)).not.toBeNull();
    expect(grantError(10_001)).not.toBeNull();
  });
  it("never debits below zero", () => {
    expect(adjustError(-5, 5)).toBeNull();
    expect(adjustError(-6, 5)).toMatch(/at most 5/);
    expect(adjustError(0, 5)).not.toBeNull();
    expect(adjustError(3, 0)).toBeNull();
  });
  it("keeps included credits inside the balance", () => {
    expect(includedAfter(10, 4)).toBe(4);
    expect(includedAfter(10, 40)).toBe(10);
    expect(includedAfter(3, -1)).toBe(0);
  });
});

describe("refundAmount", () => {
  it("gives back what the session was charged (coach costs 3)", () => {
    expect(refundAmount([{ kind: "CONSUMPTION", amount: -3 }])).toEqual({ amount: 3 });
  });
  it("refuses a second refund", () => {
    expect(refundAmount([{ kind: "CONSUMPTION", amount: -1 }, { kind: "REFUND", amount: 1 }])).toHaveProperty("error");
  });
  it("refuses a session that was never charged", () => {
    expect(refundAmount([])).toHaveProperty("error");
  });
});

describe("kindMeta", () => {
  it("labels unknown kinds readably", () => {
    expect(kindMeta("RECORDING_FEE").label).toBe("Recording fee");
  });
});
