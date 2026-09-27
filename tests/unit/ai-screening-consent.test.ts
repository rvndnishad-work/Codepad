/**
 * With "Ask for consent" on (Settings > Candidate experience), an AI
 * screening cannot start, and no credit is charged, until the candidate has
 * ticked the consent box. Screenings already under way keep going.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  aIInterviewSession: { findUnique: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
  aIInterviewCreditLedger: { aggregate: vi.fn(async () => ({ _sum: { amount: 10 } })), create: vi.fn(async () => ({})) },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }));
vi.mock("@/lib/notifications/triggers", () => ({ notifyAiCreditsLowIfNeeded: vi.fn(async () => {}) }));

import { ConsentRequiredError, consumeCreditIfFirstTurn } from "@/lib/ai-interview/credits";

const session = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  workspaceId: "ws1",
  startedAt: null,
  practice: false,
  engagementLevel: "REACTIVE",
  consentAt: null,
  workspace: { consentRequired: true },
  ...over,
});

describe("AI screening consent", () => {
  beforeEach(() => {
    tx.aIInterviewSession.findUnique.mockReset();
    tx.aIInterviewCreditLedger.create.mockClear();
    tx.aIInterviewSession.updateMany.mockClear();
  });

  it("refuses to start without consent and charges nothing", async () => {
    tx.aIInterviewSession.findUnique.mockResolvedValue(session());
    await expect(consumeCreditIfFirstTurn("s1")).rejects.toBeInstanceOf(ConsentRequiredError);
    expect(tx.aIInterviewSession.updateMany).not.toHaveBeenCalled();
    expect(tx.aIInterviewCreditLedger.create).not.toHaveBeenCalled();
  });

  it("starts once consent is stamped", async () => {
    tx.aIInterviewSession.findUnique.mockResolvedValue(session({ consentAt: new Date() }));
    await expect(consumeCreditIfFirstTurn("s1")).resolves.toEqual({ charged: true });
  });

  it("starts as before when the workspace does not ask", async () => {
    tx.aIInterviewSession.findUnique.mockResolvedValue(session({ workspace: { consentRequired: false } }));
    await expect(consumeCreditIfFirstTurn("s1")).resolves.toEqual({ charged: true });
  });

  it("lets a screening already under way continue", async () => {
    tx.aIInterviewSession.findUnique.mockResolvedValue(session({ startedAt: new Date() }));
    await expect(consumeCreditIfFirstTurn("s1")).resolves.toEqual({ charged: false });
  });
});
