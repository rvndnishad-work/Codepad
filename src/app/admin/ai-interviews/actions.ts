"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { grantCredits, refundCredit } from "@/lib/ai-interview/credits";

async function assertAdminUser(): Promise<string> {
  const session = await auth().catch(() => null);
  if (!isAdmin(session) || !session?.user?.id) {
    throw new Error("Unauthorized: Admin privilege required.");
  }
  return session.user.id;
}

export async function grantCreditsAction(input: {
  workspaceId: string;
  amount: number;
  note: string;
}) {
  const adminUserId = await assertAdminUser();

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
    throw new Error("Grant amount must be between 1 and 10000.");
  }
  if (!input.note?.trim()) {
    throw new Error("A note is required for audit trail.");
  }

  await grantCredits({
    workspaceId: input.workspaceId,
    amount,
    adminUserId,
    note: input.note,
  });

  revalidatePath("/admin/ai-interviews");
  return { success: true };
}

export async function refundSessionAction(input: {
  sessionId: string;
  note: string;
}) {
  const adminUserId = await assertAdminUser();

  const session = await prisma.aIInterviewSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, workspaceId: true, startedAt: true },
  });
  if (!session) throw new Error("Session not found");
  if (!session.startedAt) {
    throw new Error("Cannot refund a session that was never charged (candidate did not start).");
  }

  // Look for an existing refund to prevent double-refunds.
  const existing = await prisma.aIInterviewCreditLedger.findFirst({
    where: { sessionId: session.id, kind: "REFUND" },
    select: { id: true },
  });
  if (existing) {
    throw new Error("This session has already been refunded.");
  }

  await refundCredit({
    workspaceId: session.workspaceId,
    sessionId: session.id,
    adminUserId,
    note: input.note,
  });

  revalidatePath("/admin/ai-interviews");
  return { success: true };
}
