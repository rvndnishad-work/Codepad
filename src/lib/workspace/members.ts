/**
 * Pure rules for the Members and Billing pages: seat usage, role-change and
 * removal guards, and the last-active throttle. No database access, so the
 * API routes, pages and unit tests all share the exact same decisions.
 */
import { effectivePlan, type PlanFields } from "@/lib/billing/trial";

/** Workspace roles in privilege order. */
export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "RECRUITER", "INTERVIEWER", "VIEWER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Roles that can be given on invite. Ownership only moves by a role change. */
export const INVITABLE_ROLES = ["ADMIN", "RECRUITER", "INTERVIEWER", "VIEWER"] as const;

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  RECRUITER: "Recruiter",
  INTERVIEWER: "Interviewer",
  VIEWER: "Viewer",
};

export type SeatUsage = {
  /** Members plus unexpired pending invites. */
  used: number;
  members: number;
  pendingInvites: number;
  /** null when seats are billed per seat instead of capped. */
  limit: number | null;
  /** Seats left before the cap; null when uncapped. */
  remaining: number | null;
  full: boolean;
  onTrial: boolean;
};

/**
 * Seat usage for a workspace. Pending invites count, so a batch of invites
 * cannot overshoot the cap. The cap comes from effectivePlan: the trial cap
 * during a trial, the Free cap on Free, and none on paid per-seat plans.
 */
export function seatUsage(
  ws: PlanFields,
  counts: { members: number; pendingInvites: number },
  now: Date = new Date(),
): SeatUsage {
  const { seatLimit, onTrial } = effectivePlan(ws, now);
  const used = counts.members + counts.pendingInvites;
  return {
    used,
    members: counts.members,
    pendingInvites: counts.pendingInvites,
    limit: seatLimit,
    remaining: seatLimit === null ? null : Math.max(0, seatLimit - used),
    full: seatLimit !== null && used >= seatLimit,
    onTrial,
  };
}

type MemberLike = { id: string; role: string };

export type GuardResult = { ok: true } | { ok: false; status: 400 | 403; error: string };

const OK: GuardResult = { ok: true };

/**
 * Can `caller` move `target` to `nextRole`? Permission to change roles at all
 * (member:set_role) is checked by the caller; this adds the ownership rules:
 *   - only an owner may grant or take away the Owner role
 *   - the last owner cannot be demoted
 */
export function checkRoleChange(params: {
  caller: MemberLike;
  target: MemberLike;
  nextRole: string;
  members: MemberLike[];
}): GuardResult {
  const { caller, target, nextRole, members } = params;
  if (!(WORKSPACE_ROLES as readonly string[]).includes(nextRole)) {
    return { ok: false, status: 400, error: "Unknown role." };
  }
  if (nextRole === target.role) return OK;
  const touchesOwnership = nextRole === "OWNER" || target.role === "OWNER";
  if (touchesOwnership && caller.role !== "OWNER") {
    return { ok: false, status: 403, error: "Only an owner can give or take away the Owner role." };
  }
  if (target.role === "OWNER" && nextRole !== "OWNER" && ownerCount(members, target.id) === 0) {
    return { ok: false, status: 400, error: "This is the only owner. Make someone else an owner first." };
  }
  return OK;
}

/**
 * Can `caller` remove `target`? Permission to remove (member:remove) is
 * checked by the caller; this adds: only an owner removes an owner, and the
 * last owner cannot be removed.
 */
export function checkRemoval(params: { caller: MemberLike; target: MemberLike; members: MemberLike[] }): GuardResult {
  const { caller, target, members } = params;
  if (target.role === "OWNER") {
    if (caller.role !== "OWNER") {
      return { ok: false, status: 403, error: "Only an owner can remove another owner." };
    }
    if (ownerCount(members, target.id) === 0) {
      return { ok: false, status: 400, error: "This is the only owner. Make someone else an owner first." };
    }
  }
  return OK;
}

/** Owners other than `excludeId`. */
function ownerCount(members: MemberLike[], excludeId: string): number {
  return members.filter((m) => m.role === "OWNER" && m.id !== excludeId).length;
}

/** lastActiveAt is written at most once per this window. */
export const ACTIVITY_WRITE_INTERVAL_MS = 60 * 60 * 1000;

/** True when lastActiveAt is missing or older than the write window. */
export function shouldTouchActivity(lastActiveAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!lastActiveAt) return true;
  return now.getTime() - new Date(lastActiveAt).getTime() >= ACTIVITY_WRITE_INTERVAL_MS;
}

/** A member who has not opened the workspace for this many days is flagged as inactive. */
export const INACTIVE_AFTER_DAYS = 30;

export function isInactive(lastActiveAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!lastActiveAt) return false; // unknown, not inactive
  return now.getTime() - new Date(lastActiveAt).getTime() > INACTIVE_AFTER_DAYS * 86_400_000;
}
