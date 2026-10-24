import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { poolBalances, poolWhere } from "./credit-pool";

// A tiny stand-in for the query poolBalances runs.
function fakeDb(ledger: { workspaceId: string; amount: number }[]) {
  return {
    aIInterviewCreditLedger: {
      groupBy: async ({ where }: { where: { workspaceId: { in: string[] } } }) => {
        const sums = new Map<string, number>();
        for (const row of ledger) {
          if (!where.workspaceId.in.includes(row.workspaceId)) continue;
          sums.set(row.workspaceId, (sums.get(row.workspaceId) ?? 0) + row.amount);
        }
        return [...sums].map(([workspaceId, amount]) => ({ workspaceId, _sum: { amount } }));
      },
    },
  } as never;
}

describe("workspace balances", () => {
  it("counts only the workspace's own ledger rows", () => {
    expect(poolWhere("ws1")).toEqual({ workspaceId: "ws1" });
  });

  it("keeps each workspace's balance separate, even on one account", async () => {
    const db = fakeDb([
      { workspaceId: "a1", amount: 100 },
      { workspaceId: "a1", amount: -3 },
      { workspaceId: "a2", amount: 20 },
    ]);
    const out = await poolBalances(["a1", "a2", "b1"], db);
    expect(out.get("a1")).toBe(97);
    expect(out.get("a2")).toBe(20);
    expect(out.get("b1")).toBe(0);
  });
});
