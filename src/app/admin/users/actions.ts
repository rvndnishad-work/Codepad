"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import {
  forceSignOut,
  hardDeleteUser,
  resetTwoFactor,
  restoreUser,
  softDeleteUser,
  suspendUser,
  unsuspendUser,
  verifyEmail,
  type Actor,
  type OpResult,
} from "./_lib/ops";

const BULK_MAX = 100;

async function actor(): Promise<Actor | null> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "user:manage"))) return null;
  return {
    id: session?.user?.id,
    email: session?.user?.email,
    isPlatformAdmin: await staffCan(session, "platform:admin"),
  };
}

const DENIED: { ok: false; error: string } = { ok: false, error: "You do not have permission to manage users." };

const idSchema = z.string().min(1).max(64);

/** "yyyy-mm-dd" or a full ISO string → Date; "" → null (no end). */
const untilSchema = z
  .string()
  .max(40)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T23:59:59.999Z` : v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid end date." });
      return z.NEVER;
    }
    return d;
  });

const suspendSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
  until: untilSchema,
});

function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Invalid input.";
}

export async function suspendUserAction(userId: string, input: { reason: string; until?: string }): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return suspendUser(a, idSchema.parse(userId), parsed.data);
}

export async function unsuspendUserAction(userId: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  return unsuspendUser(a, idSchema.parse(userId));
}

export async function forceSignOutAction(userId: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  return forceSignOut(a, idSchema.parse(userId));
}

export async function resetTwoFactorAction(userId: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  return resetTwoFactor(a, idSchema.parse(userId));
}

export async function verifyEmailAction(userId: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  return verifyEmail(a, idSchema.parse(userId));
}

export async function softDeleteUserAction(userId: string, note?: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  return softDeleteUser(a, idSchema.parse(userId), note?.trim().slice(0, 1000) || undefined);
}

export async function restoreUserAction(userId: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  return restoreUser(a, idSchema.parse(userId));
}

export async function hardDeleteUserAction(userId: string, confirm: string, note?: string): Promise<OpResult> {
  const a = await actor();
  if (!a) return DENIED;
  if (!a.isPlatformAdmin) return { ok: false, error: "Only a platform admin can permanently delete an account." };
  return hardDeleteUser(a, idSchema.parse(userId), String(confirm ?? ""), note?.trim().slice(0, 1000) || undefined);
}

export type BulkResult = { ok: true; done: number; failed: { id: string; error: string }[] } | { ok: false; error: string };

const bulkIds = z.array(idSchema).min(1, "Select at least one account.").max(BULK_MAX, `At most ${BULK_MAX} at a time.`);

async function runBulk(ids: unknown, fn: (id: string) => Promise<OpResult>): Promise<BulkResult> {
  const parsed = bulkIds.safeParse(ids);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const failed: { id: string; error: string }[] = [];
  let done = 0;
  // Sequential: each one is its own audited change, and 100 is the cap.
  for (const id of new Set(parsed.data)) {
    const r = await fn(id);
    if (r.ok) done++;
    else failed.push({ id, error: r.error });
  }
  return { ok: true, done, failed };
}

export async function bulkSuspendAction(ids: string[], input: { reason: string; until?: string }): Promise<BulkResult> {
  const a = await actor();
  if (!a) return DENIED;
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return runBulk(ids, (id) => suspendUser(a, id, parsed.data));
}

export async function bulkSignOutAction(ids: string[]): Promise<BulkResult> {
  const a = await actor();
  if (!a) return DENIED;
  return runBulk(ids, (id) => forceSignOut(a, id));
}
