import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { poolBalances, poolWhere } from "./credit-pool";

// A tiny stand-in for the two queries poolBalances runs.
function fakeDb(workspaces: { id: string; billingAccountId: string | null }[], ledger: { billingAccountId: string; amount: number }[]) {
  return {
    workspace: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => workspaces.filter((w) => where.id.in.includes(w.id)),
    },
    aIInterviewCreditLedger: {
      groupBy: async ({ where }: { where: { billingAccountId: { in: string[] } } }) => {
        const sums = new Map<string, number>();
        for (const row of ledger) {
          if (!where.billingAccountId.in.includes(row.billingAccountId)) continue;
          sums.set(row.billingAccountId, (sums.get(row.billingAccountId) ?? 0) + row.amount);
        }
        return [...sums].map(([billingAccountId, amount]) => ({ billingAccountId, _sum: { amount } }));
      },
    },
  } as never;
}

describe("credit pool", () => {
  it("filters ledger rows by the workspace's account, not the workspace", () => {
    expect(poolWhere("ws1")).toEqual({ billingAccount: { workspaces: { some: { id: "ws1" } } } });
  });

  it("gives every workspace on an account the same balance", async () => {
    const db = fakeDb(
      [
        { id: "a1", billingAccountId: "acct" },
        { id: "a2", billingAccountId: "acct" },
        { id: "b1", billingAccountId: "solo" },
        { id: "c1", billingAccountId: null },
      ],
      [
        { billingAccountId: "acct", amount: 100 },
        { billingAccountId: "acct", amount: -3 },
        { billingAccountId: "solo", amount: 10 },
      ],
    );
    const out = await poolBalances(["a1", "a2", "b1", "c1", "missing"], db);
    expect(Object.fromEntries(out)).toEqual({ a1: 97, a2: 97, b1: 10, c1: 0, missing: 0 });
  });

  it("returns an empty map for no workspaces", async () => {
    expect((await poolBalances([], fakeDb([], []))).size).toBe(0);
  });
});
