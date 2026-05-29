import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Cost (in credits) for a single AI screening. Centralized so it can later be
 * read from plan config without touching call sites.
 */
export const AI_INTERVIEW_COST_PER_SESSION = 1;

/**
 * Public-facing credit pack tiers. Prices are USD cents. Keep in sync with any
 * Stripe Product/Price catalog you decide to set up — the checkout flow uses
 * `price_data` so no Stripe-side IDs are required to start.
 */
export const AI_CREDIT_PACKS = [
  {
    id: "starter-10",
    credits: 10,
    priceCents: 2900,
    label: "Starter",
    sublabel: "10 screenings",
  },
  {
    id: "team-50",
    credits: 50,
    priceCents: 12900,
    label: "Team",
    sublabel: "50 screenings",
    badge: "Most popular",
  },
  {
    id: "scale-200",
    credits: 200,
    priceCents: 44900,
    label: "Scale",
    sublabel: "200 screenings",
  },
] as const;

export type AiCreditPack = (typeof AI_CREDIT_PACKS)[number];

export function getAiCreditPack(id: string): AiCreditPack | undefined {
  return AI_CREDIT_PACKS.find((p) => p.id === id);
}

/**
 * Workspace plans that have access to the AI Screening feature.
 * FREE/STARTER do not, regardless of credit balance.
 */
const ENABLED_PLANS = new Set(["GROWTH", "ENTERPRISE"]);

export function workspacePlanAllowsAiScreening(planName: string): boolean {
  return ENABLED_PLANS.has(planName);
}

/**
 * Compute the workspace's current credit balance from the append-only ledger.
 * Balance = SUM(amount). No denormalized counter — single source of truth.
 */
export async function getWorkspaceCredits(workspaceId: string): Promise<number> {
  const agg = await prisma.aIInterviewCreditLedger.aggregate({
    where: { workspaceId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/**
 * Sum credit usage in a time window. Used by the admin console to show
 * "credits used this month" per workspace.
 */
export async function getWorkspaceUsage(
  workspaceId: string,
  since: Date
): Promise<number> {
  const agg = await prisma.aIInterviewCreditLedger.aggregate({
    where: {
      workspaceId,
      kind: "CONSUMPTION",
      createdAt: { gte: since },
    },
    _sum: { amount: true },
  });
  // CONSUMPTION rows are negative; flip sign for display.
  return -(agg._sum.amount ?? 0);
}

/**
 * Atomically attempt to charge the workspace for the candidate's first message.
 *
 * Race safety: uses `updateMany WHERE startedAt IS NULL` so that two concurrent
 * first POSTs cannot both succeed — at most one will see count===1 and write
 * the ledger row. The loser is treated as a normal subsequent turn.
 *
 * Returns `{ charged: true }` on first call, `{ charged: false }` on subsequent
 * calls. Throws `InsufficientCreditsError` if balance is too low.
 */
export class InsufficientCreditsError extends Error {
  constructor(public balance: number) {
    super(`Workspace has insufficient AI interview credits (balance: ${balance})`);
    this.name = "InsufficientCreditsError";
  }
}

export async function consumeCreditIfFirstTurn(
  sessionId: string
): Promise<{ charged: boolean }> {
  return prisma.$transaction(async (tx) => {
    const session = await tx.aIInterviewSession.findUnique({
      where: { id: sessionId },
      select: { id: true, workspaceId: true, startedAt: true },
    });
    if (!session) throw new Error("Session not found");

    // Fast path: already charged on a previous turn.
    if (session.startedAt) return { charged: false };

    // Check balance before attempting the claim. We re-check after the claim
    // succeeds to keep this transaction's view consistent.
    const balance = await sumLedger(tx, session.workspaceId);
    if (balance < AI_INTERVIEW_COST_PER_SESSION) {
      throw new InsufficientCreditsError(balance);
    }

    // Race-safe claim: only the request that flips startedAt NULL -> NOW wins.
    const claimed = await tx.aIInterviewSession.updateMany({
      where: { id: sessionId, startedAt: null },
      data: { startedAt: new Date(), status: "ACTIVE" },
    });

    if (claimed.count === 0) {
      // Lost the race — another concurrent request already started the session.
      return { charged: false };
    }

    await tx.aIInterviewCreditLedger.create({
      data: {
        workspaceId: session.workspaceId,
        kind: "CONSUMPTION",
        amount: -AI_INTERVIEW_COST_PER_SESSION,
        sessionId: session.id,
      },
    });

    // Compute post-consumption balance INSIDE the transaction so we read a
    // consistent snapshot. Pass it out for the IP-44 notification trigger to
    // evaluate against the threshold.
    const newBalance = await sumLedger(tx, session.workspaceId);

    return { charged: true, workspaceId: session.workspaceId, newBalance };
  })
    .then(async (result) => {
      // IP-44: AI_CREDITS_LOW notification fires AFTER the transaction so a
      // notification failure can never roll back the credit charge. Helper
      // is dedup-guarded (24h per workspace) and threshold-guarded.
      if (result.charged && result.workspaceId && result.newBalance !== undefined) {
        const { notifyAiCreditsLowIfNeeded } = await import(
          "@/lib/notifications/triggers"
        );
        await notifyAiCreditsLowIfNeeded({
          workspaceId: result.workspaceId,
          balance: result.newBalance,
        });
      }
      return { charged: result.charged };
    });
}

async function sumLedger(
  tx: Prisma.TransactionClient,
  workspaceId: string
): Promise<number> {
  const agg = await tx.aIInterviewCreditLedger.aggregate({
    where: { workspaceId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/**
 * Admin-issued credit grant. Always positive amount, requires a note for audit.
 */
export async function grantCredits(params: {
  workspaceId: string;
  amount: number;
  adminUserId: string;
  note: string;
}) {
  if (params.amount <= 0) {
    throw new Error("Grant amount must be positive");
  }
  if (!params.note.trim()) {
    throw new Error("Grant note is required");
  }
  return prisma.aIInterviewCreditLedger.create({
    data: {
      workspaceId: params.workspaceId,
      kind: "GRANT",
      amount: params.amount,
      adminUserId: params.adminUserId,
      note: params.note.trim(),
    },
  });
}

/**
 * Record a Stripe-paid credit purchase. Idempotent on `stripeChargeId` so
 * webhook redelivery cannot double-credit a workspace.
 * Returns `{ recorded: true }` if a new ledger row was created, or
 * `{ recorded: false }` if this charge was already processed.
 */
export async function recordPurchase(params: {
  workspaceId: string;
  amount: number;
  stripeChargeId: string;
  note?: string;
}): Promise<{ recorded: boolean }> {
  if (params.amount <= 0) {
    throw new Error("Purchase amount must be positive");
  }
  const existing = await prisma.aIInterviewCreditLedger.findFirst({
    where: { stripeChargeId: params.stripeChargeId, kind: "PURCHASE" },
    select: { id: true },
  });
  if (existing) return { recorded: false };

  await prisma.aIInterviewCreditLedger.create({
    data: {
      workspaceId: params.workspaceId,
      kind: "PURCHASE",
      amount: params.amount,
      stripeChargeId: params.stripeChargeId,
      note: params.note,
    },
  });
  return { recorded: true };
}

/**
 * Refund a consumed credit. Used by admin when a screening is voided
 * (e.g. AI grading failure, candidate technical issue).
 */
export async function refundCredit(params: {
  workspaceId: string;
  sessionId: string;
  adminUserId: string;
  note: string;
}) {
  return prisma.aIInterviewCreditLedger.create({
    data: {
      workspaceId: params.workspaceId,
      kind: "REFUND",
      amount: AI_INTERVIEW_COST_PER_SESSION,
      sessionId: params.sessionId,
      adminUserId: params.adminUserId,
      note: params.note.trim() || "Admin refund",
    },
  });
}
