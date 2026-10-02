"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { logAdminAction } from "@/lib/admin/audit";
import type { ActionResult } from "../interviews/_components/ConfirmAction";
import { adjustError, grantError, includedAfter, refundAmount } from "./credits-math";

async function actor() {
  const session = await requireAdminAccess();
  if (!session?.user?.id) throw new Error("Not signed in.");
  return { id: session.user.id, email: session.user.email ?? null };
}

function requiredNote(note: string): string | null {
  const n = (note ?? "").trim().slice(0, 500);
  return n.length ? n : null;
}

const plural = (n: number) => `${n} credit${Math.abs(n) === 1 ? "" : "s"}`;

/** Add credits to a workspace. Note required, audit logged. */
export async function grantCreditsAction(workspaceId: string, amount: number, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = requiredNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };
  const err = grantError(amount);
  if (err) return { ok: false, error: err };
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  if (!ws) return { ok: false, error: "That workspace no longer exists." };

  const { before, after } = await prisma.$transaction(async (tx) => {
    const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    const before = agg._sum.amount ?? 0;
    await tx.aIInterviewCreditLedger.create({ data: { workspaceId, kind: "GRANT", amount, adminUserId: who.id, note: n } });
    return { before, after: before + amount };
  });
  await logAdminAction({
    actor: who,
    action: "workspace.credits.grant",
    targetType: "workspace",
    targetId: workspaceId,
    targetLabel: ws.name,
    before: { balance: before },
    after: { balance: after, granted: amount },
    note: n,
  });
  revalidatePath("/admin/ai-interviews");
  return { ok: true, message: `Granted ${plural(amount)} to ${ws.name}.` };
}

/**
 * Add or take off credits (signed). A debit cannot take the balance below
 * zero; the balance check and the write happen in one transaction with the
 * workspace row locked, so two debits cannot both pass the check.
 */
export async function adjustCreditsAction(workspaceId: string, amount: number, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = requiredNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };
  if (!Number.isInteger(amount) || amount === 0) return { ok: false, error: "Enter a whole number of credits, not 0." };

  let result: { name: string; before: number; after: number; includedBefore: number; includedNow: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`);
      if (!locked.length) throw new UserError("That workspace no longer exists.");
      const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true, includedCreditsLeft: true } });
      const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } });
      const before = agg._sum.amount ?? 0;
      const err = adjustError(amount, before);
      if (err) throw new UserError(err);
      await tx.aIInterviewCreditLedger.create({ data: { workspaceId, kind: "ADJUSTMENT", amount, adminUserId: who.id, note: n } });
      const after = before + amount;
      const includedNow = includedAfter(ws.includedCreditsLeft, after);
      if (includedNow !== ws.includedCreditsLeft) {
        await tx.workspace.update({ where: { id: workspaceId }, data: { includedCreditsLeft: includedNow } });
      }
      return { name: ws.name, before, after, includedBefore: ws.includedCreditsLeft, includedNow };
    });
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
  await logAdminAction({
    actor: who,
    action: "workspace.credits.adjust",
    targetType: "workspace",
    targetId: workspaceId,
    targetLabel: result.name,
    before: { balance: result.before, includedLeft: result.includedBefore },
    after: { balance: result.after, includedLeft: result.includedNow, adjusted: amount },
    note: n,
  });
  revalidatePath("/admin/ai-interviews");
  return { ok: true, message: `${amount > 0 ? "Added" : "Took off"} ${plural(Math.abs(amount))}. Balance is now ${result.after}.` };
}

/**
 * Refund a screening: gives back exactly what its CONSUMPTION rows charged.
 * One transaction with the session row locked: it must have been charged
 * and must not have a REFUND row yet, so a double click cannot refund twice.
 */
export async function refundSessionAction(sessionId: string, note: string): Promise<ActionResult> {
  const who = await actor();
  const n = requiredNote(note);
  if (!n) return { ok: false, error: "Add a note saying why." };

  let result: { workspaceId: string; workspaceName: string; candidateName: string; amount: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "AIInterviewSession" WHERE id = ${sessionId} FOR UPDATE`);
      if (!locked.length) throw new UserError("That screening no longer exists.");
      const s = await tx.aIInterviewSession.findUniqueOrThrow({
        where: { id: sessionId },
        select: { workspaceId: true, candidateName: true, practice: true, workspace: { select: { name: true } } },
      });
      if (s.practice) throw new UserError("Practice runs are free, so there is nothing to refund.");
      const rows = await tx.aIInterviewCreditLedger.findMany({
        where: { sessionId, kind: { in: ["CONSUMPTION", "REFUND"] } },
        select: { kind: true, amount: true },
      });
      const r = refundAmount(rows);
      if ("error" in r) throw new UserError(r.error);
      await tx.aIInterviewCreditLedger.create({
        data: { workspaceId: s.workspaceId, kind: "REFUND", amount: r.amount, sessionId, adminUserId: who.id, note: n },
      });
      return { workspaceId: s.workspaceId, workspaceName: s.workspace.name, candidateName: s.candidateName, amount: r.amount };
    });
  } catch (e) {
    if (e instanceof UserError) return { ok: false, error: e.message };
    throw e;
  }
  await logAdminAction({
    actor: who,
    action: "workspace.credits.refund",
    targetType: "workspace",
    targetId: result.workspaceId,
    targetLabel: result.workspaceName,
    after: { sessionId, candidateName: result.candidateName, refunded: result.amount },
    note: n,
  });
  revalidatePath("/admin/ai-interviews");
  return { ok: true, message: `Refunded ${plural(result.amount)} to ${result.workspaceName}.` };
}

class UserError extends Error {}
