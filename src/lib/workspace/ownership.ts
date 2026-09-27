/**
 * Making someone an owner, or handing ownership over. Pure, so the member
 * menu, the confirm dialog and the server action agree.
 *
 *   - "add": the member becomes an owner alongside the current owners.
 *   - "transfer": the member becomes an owner and the caller steps down to
 *     admin. When the caller was the only owner, the member is now the only one.
 */
import type { GuardResult } from "./members";

export type OwnerChangeMode = "add" | "transfer";

type MemberLike = { id: string; role: string };

export function checkOwnerChange(params: {
  caller: MemberLike;
  target: MemberLike;
  mode: OwnerChangeMode;
}): GuardResult {
  const { caller, target, mode } = params;
  if (caller.role !== "OWNER") return { ok: false, status: 403, error: "Only an owner can make someone an owner." };
  if (target.id === caller.id) return { ok: false, status: 400, error: "You are already an owner." };
  if (target.role === "OWNER") {
    return { ok: false, status: 400, error: mode === "transfer" ? "They are already an owner. Change your own role instead." : "They are already an owner." };
  }
  return { ok: true };
}

/** Owners once the change is made. */
export function ownersAfter(members: MemberLike[], targetId: string, callerId: string, mode: OwnerChangeMode): string[] {
  return members
    .filter((m) => (m.id === targetId ? true : m.id === callerId && mode === "transfer" ? false : m.role === "OWNER"))
    .map((m) => m.id);
}

/** The audit action for the change: a transfer that leaves one owner reads as a transfer. */
export function ownerChangeAudit(ownersAfterCount: number, mode: OwnerChangeMode): "MEMBER_OWNERSHIP_TRANSFERRED" | "MEMBER_OWNER_ADDED" {
  return mode === "transfer" && ownersAfterCount === 1 ? "MEMBER_OWNERSHIP_TRANSFERRED" : "MEMBER_OWNER_ADDED";
}

/** True when the workspace has exactly one owner, so losing them locks everyone out of owner-only settings. */
export function isSingleOwner(members: { role: string }[]): boolean {
  return members.filter((m) => m.role === "OWNER").length === 1;
}
