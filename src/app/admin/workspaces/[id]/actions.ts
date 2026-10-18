"use server";

/**
 * Server actions for /admin/workspaces/[id]. Each checks platform:admin,
 * calls the matching function in src/lib/admin/workspace-actions.ts (which
 * writes the audit row) and refreshes the workspace pages.
 */
import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/permissions/staff";
import * as A from "@/lib/admin/workspace-actions";

async function ctx() {
  const session = await requireAdminAccess("platform:admin");
  return { actor: { id: session?.user?.id ?? null, email: session?.user?.email ?? null } };
}

function done<T extends A.Result<object>>(workspaceId: string, r: T): T {
  if (r.ok) {
    revalidatePath(`/admin/workspaces/${workspaceId}`, "layout");
    revalidatePath("/admin/workspaces");
  }
  return r;
}

export async function syncSeatsAction(id: string) {
  return done(id, await A.syncSeats(await ctx(), id));
}
export async function retryPaymentAction(id: string) {
  return done(id, await A.retryPayment(await ctx(), id));
}
export async function compMonthAction(id: string, note: string) {
  return done(id, await A.compMonth(await ctx(), id, note));
}
export async function changePlanAction(id: string, plan: string, note: string) {
  return done(id, await A.changePlan(await ctx(), id, plan, note));
}
export async function extendTrialAction(id: string, days: number, note: string) {
  return done(id, await A.extendTrial(await ctx(), id, days, note));
}
export async function grantCreditsAction(id: string, amount: string, note: string, emailOwner: boolean) {
  return done(id, await A.grantWorkspaceCredits(await ctx(), id, { amount, note, emailOwner }));
}
export async function adjustCreditsAction(id: string, amount: string, note: string) {
  return done(id, await A.adjustWorkspaceCredits(await ctx(), id, { amount, note }));
}
export async function refundSessionAction(id: string, sessionId: string, note: string) {
  return done(id, await A.refundSession(await ctx(), id, { sessionId, note }));
}
export async function refundableSessionsAction(id: string) {
  await ctx();
  return A.refundableSessions(id);
}
export async function turnVideoOffAction(id: string, note: string) {
  return done(id, await A.turnVideoOff(await ctx(), id, note));
}
export async function lockAction(id: string, reason: string) {
  return done(id, await A.lockWorkspace(await ctx(), id, reason));
}
export async function unlockAction(id: string, note: string) {
  return done(id, await A.unlockWorkspace(await ctx(), id, note));
}
export async function scheduleDeletionAction(id: string, confirmName: string, note: string) {
  return done(id, await A.scheduleDeletion(await ctx(), id, { confirmName, note }));
}
export async function cancelDeletionAction(id: string, note: string) {
  return done(id, await A.cancelScheduledDeletion(await ctx(), id, note));
}
export async function changeRoleAction(id: string, memberId: string, role: string) {
  return done(id, await A.changeMemberRole(await ctx(), id, memberId, role));
}
export async function transferOwnerAction(id: string, memberId: string, note: string) {
  return done(id, await A.transferOwnership(await ctx(), id, memberId, note));
}
export async function removeMemberAction(id: string, memberId: string, takeoverMemberId: string, note: string) {
  return done(id, await A.removeMember(await ctx(), id, memberId, takeoverMemberId, note));
}
export async function revokeInviteAction(id: string, inviteId: string) {
  return done(id, await A.revokeInvite(await ctx(), id, inviteId));
}
