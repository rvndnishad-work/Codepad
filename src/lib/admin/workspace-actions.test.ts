import { describe, expect, it } from "vitest";
import {
  adminRoleChange,
  cleanNote,
  compMonthCents,
  csvCell,
  extendedTrialEnd,
  includedAfterBalance,
  ownerTransferPlan,
  pageOf,
  parseCreditAmount,
  parseLedgerFilter,
  refundEligibility,
  seatDiff,
  toCsv,
  workspaceStatusPills,
} from "./workspace-actions";

describe("refundEligibility", () => {
  it("refunds what was charged", () => {
    expect(refundEligibility([{ kind: "CONSUMPTION", amount: -1 }])).toEqual({ ok: true, amount: 1 });
    expect(refundEligibility([{ kind: "CONSUMPTION", amount: -3 }])).toEqual({ ok: true, amount: 3 });
  });
  it("refuses a second refund", () => {
    const r = refundEligibility([{ kind: "CONSUMPTION", amount: -1 }, { kind: "REFUND", amount: 1 }]);
    expect(r.ok).toBe(false);
  });
  it("refuses a session that was never charged", () => {
    expect(refundEligibility([]).ok).toBe(false);
    expect(refundEligibility([{ kind: "GRANT", amount: 5 }]).ok).toBe(false);
  });
});

describe("seatDiff", () => {
  it("counts unbilled seats", () => {
    expect(seatDiff(4, 5)).toEqual({ billed: 4, members: 5, diff: 1, inSync: false, target: 5 });
  });
  it("is in sync when billed equals members", () => {
    expect(seatDiff(5, 5).inSync).toBe(true);
  });
  it("never targets zero seats", () => {
    expect(seatDiff(1, 0)).toMatchObject({ target: 1, inSync: true, diff: -1 });
  });
  it("unknown billed seats are not in sync and have no diff", () => {
    expect(seatDiff(null, 3)).toEqual({ billed: null, members: 3, diff: 0, inSync: false, target: 3 });
  });
});

describe("parseCreditAmount", () => {
  it("accepts whole positive numbers", () => {
    expect(parseCreditAmount("20")).toEqual({ ok: true, amount: 20 });
  });
  it("rejects zero, fractions, negatives for grants and huge numbers", () => {
    expect(parseCreditAmount("0").ok).toBe(false);
    expect(parseCreditAmount("1.5").ok).toBe(false);
    expect(parseCreditAmount("-2").ok).toBe(false);
    expect(parseCreditAmount("abc").ok).toBe(false);
    expect(parseCreditAmount("10001").ok).toBe(false);
  });
  it("allows negatives for adjustments", () => {
    expect(parseCreditAmount("-2", { allowNegative: true })).toEqual({ ok: true, amount: -2 });
  });
});

describe("cleanNote", () => {
  it("requires a note", () => {
    expect(cleanNote("  ").ok).toBe(false);
    expect(cleanNote("ab").ok).toBe(false);
    expect(cleanNote("  agreed   on call ")).toEqual({ ok: true, note: "agreed on call" });
  });
});

describe("extendedTrialEnd", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  it("extends from the current end while the trial runs", () => {
    const r = extendedTrialEnd(new Date("2026-10-05T00:00:00Z"), 7, now);
    expect(r.ok && r.trialEndsAt.toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });
  it("extends from now once the trial ended", () => {
    const r = extendedTrialEnd(new Date("2026-09-01T00:00:00Z"), 7, now);
    expect(r.ok && r.trialEndsAt.toISOString()).toBe("2026-10-09T00:00:00.000Z");
  });
  it("bounds the days", () => {
    expect(extendedTrialEnd(null, 0, now).ok).toBe(false);
    expect(extendedTrialEnd(null, 91, now).ok).toBe(false);
  });
});

describe("includedAfterBalance", () => {
  it("caps included credits at the balance", () => {
    expect(includedAfterBalance(10, 4)).toBe(4);
    expect(includedAfterBalance(10, 30)).toBe(10);
    expect(includedAfterBalance(10, -2)).toBe(0);
  });
});

describe("compMonthCents", () => {
  it("needs a synced monthly amount", () => {
    expect(compMonthCents(null).ok).toBe(false);
    expect(compMonthCents(19600)).toEqual({ ok: true, cents: 19600 });
  });
});

describe("workspaceStatusPills", () => {
  const base = { planName: "FREE", stripeStatus: null, trialEndsAt: null, lockedAt: null, deletionScheduledAt: null };
  const now = new Date("2026-10-02T00:00:00Z");
  it("shows locked and past due first", () => {
    const pills = workspaceStatusPills({ ...base, planName: "GROWTH", stripeStatus: "past_due", stripeSubscriptionId: "sub", lockedAt: now }, now);
    expect(pills.map((p) => p.label)).toEqual(["Locked", "Past due"]);
  });
  it("shows a running trial", () => {
    const pills = workspaceStatusPills({ ...base, trialEndsAt: new Date("2026-10-04T00:00:00Z") }, now);
    expect(pills).toEqual([{ label: "Trial, 2 days left", tone: "warn" }]);
  });
  it("no trial pill for a paying workspace", () => {
    expect(workspaceStatusPills({ ...base, trialEndsAt: new Date("2026-10-20T00:00:00Z"), stripeSubscriptionId: "sub" }, now)).toEqual([]);
  });
});

describe("members", () => {
  const members = [
    { id: "a", role: "OWNER" },
    { id: "b", role: "ADMIN" },
    { id: "c", role: "VIEWER" },
  ];
  it("will not demote the only owner", () => {
    expect(adminRoleChange(members, "a", "ADMIN").ok).toBe(false);
    expect(adminRoleChange(members, "b", "RECRUITER").ok).toBe(true);
    expect(adminRoleChange(members, "b", "BOSS").ok).toBe(false);
  });
  it("transfer demotes the other owners", () => {
    expect(ownerTransferPlan(members, "b")).toEqual({ ok: true, demote: ["a"] });
    expect(ownerTransferPlan(members, "a").ok).toBe(false);
    expect(ownerTransferPlan(members, "zz").ok).toBe(false);
  });
});

describe("ledger filter, paging and csv", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  it("defaults to all kinds and 90 days", () => {
    const f = parseLedgerFilter({ kind: "NOPE", range: "x" }, now);
    expect(f.kind).toBeNull();
    expect(f.range).toBe("90");
    expect(f.since?.toISOString()).toBe("2026-07-04T00:00:00.000Z");
    expect(parseLedgerFilter({ kind: "REFUND", range: "all" }, now)).toEqual({ kind: "REFUND", range: "all", since: null });
  });
  it("clamps pages", () => {
    expect(pageOf("3", 45, 20)).toEqual({ page: 3, skip: 40, pages: 3 });
    expect(pageOf("9", 45, 20).page).toBe(3);
    expect(pageOf(undefined, 0, 20)).toEqual({ page: 1, skip: 0, pages: 1 });
  });
  it("escapes csv cells and neutralises formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(-3)).toBe("-3");
    expect(toCsv(["a", "b"], [[1, null]])).toBe("a,b\r\n1,\r\n");
  });
});
