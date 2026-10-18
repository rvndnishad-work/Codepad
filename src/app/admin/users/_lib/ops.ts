/**
 * User-account mutations for the admin console. Shared by the server actions
 * (./actions.ts) and the REST route (api/admin/users/[id]). Every mutation is
 * audit logged with a before/after snapshot and drops the cached session
 * status so a ban or sign-out applies on the next request.
 *
 * Server-only (imports prisma). Callers authorise first and pass the actor.
 */
import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { invalidateSessionStatus } from "@/lib/auth-session-status";
import { collectRecordingKeys, deleteRecordingKeys } from "@/lib/recording/objects-server";

export type Actor = {
  id: string | null | undefined;
  email: string | null | undefined;
  /** Holds platform:admin (full staff). Needed to act on other admins and to hard delete. */
  isPlatformAdmin: boolean;
};

export type OpResult = { ok: true; message?: string } | { ok: false; error: string };

const SNAPSHOT = {
  id: true,
  name: true,
  email: true,
  userType: true,
  emailVerified: true,
  banned: true,
  bannedReason: true,
  bannedUntil: true,
  bannedAt: true,
  bannedById: true,
  deletedAt: true,
  sessionsRevokedAt: true,
  totpEnabledAt: true,
} as const;

type Snapshot = {
  id: string;
  name: string | null;
  email: string | null;
  userType: string | null;
  emailVerified: Date | null;
  banned: boolean;
  bannedReason: string | null;
  bannedUntil: Date | null;
  bannedAt: Date | null;
  bannedById: string | null;
  deletedAt: Date | null;
  sessionsRevokedAt: Date | null;
  totpEnabledAt: Date | null;
};

type Target = Snapshot & { isPlatformAdmin: boolean };

async function loadTarget(id: string): Promise<Target | null> {
  const [user, adminRoles] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: SNAPSHOT }),
    prisma.userRole.count({ where: { userId: id, role: { key: "PLATFORM_ADMIN" } } }),
  ]);
  return user ? { ...user, isPlatformAdmin: adminRoles > 0 } : null;
}

/** Fields worth recording in the audit log (no secrets). */
function audit(u: Snapshot) {
  return {
    banned: u.banned,
    bannedReason: u.bannedReason,
    bannedUntil: u.bannedUntil,
    deletedAt: u.deletedAt,
    sessionsRevokedAt: u.sessionsRevokedAt,
    emailVerified: u.emailVerified,
    totpEnabled: u.totpEnabledAt != null,
  };
}

function label(u: Pick<Snapshot, "email" | "name" | "id">) {
  return u.email ?? u.name ?? u.id;
}

function refresh(id: string) {
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/recruiters");
  revalidatePath(`/admin/users/${id}`);
}

/** Common guards. `self` = action is refused on your own account. */
function guard(actor: Actor, t: Target | null, opts: { self?: boolean } = {}): OpResult | null {
  if (!t) return { ok: false, error: "User not found." };
  if (opts.self && actor.id === t.id) return { ok: false, error: "You cannot do this to your own account." };
  if (t.isPlatformAdmin && !actor.isPlatformAdmin) {
    return { ok: false, error: "Only a platform admin can act on another platform admin." };
  }
  return null;
}

async function finish(
  actor: Actor,
  action: string,
  before: Snapshot,
  after: Snapshot,
  note?: string | null,
): Promise<void> {
  invalidateSessionStatus(before.id);
  await logAdminAction({
    actor,
    action,
    targetType: "user",
    targetId: before.id,
    targetLabel: label(before),
    before: audit(before),
    after: audit(after),
    note: note ?? null,
  });
  refresh(before.id);
}

export async function suspendUser(
  actor: Actor,
  id: string,
  input: { reason: string; until: Date | null },
): Promise<OpResult> {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: "A reason is required." };
  if (input.until && input.until.getTime() <= Date.now()) {
    return { ok: false, error: "The end date must be in the future." };
  }
  const t = await loadTarget(id);
  const g = guard(actor, t, { self: true });
  if (g) return g;
  const now = new Date();
  const after = await prisma.user.update({
    where: { id },
    data: {
      banned: true,
      bannedReason: reason.slice(0, 1000),
      bannedUntil: input.until,
      bannedAt: now,
      bannedById: actor.id ?? null,
      sessionsRevokedAt: now,
    },
    select: SNAPSHOT,
  });
  await finish(actor, "user.suspend", t!, after, reason);
  return { ok: true, message: "Suspended and signed out." };
}

export async function unsuspendUser(actor: Actor, id: string): Promise<OpResult> {
  const t = await loadTarget(id);
  const g = guard(actor, t);
  if (g) return g;
  if (!t!.banned) return { ok: false, error: "This account is not suspended." };
  const after = await prisma.user.update({
    where: { id },
    data: { banned: false, bannedReason: null, bannedUntil: null, bannedAt: null, bannedById: null },
    select: SNAPSHOT,
  });
  await finish(actor, "user.unsuspend", t!, after);
  return { ok: true, message: "Suspension lifted." };
}

export async function forceSignOut(actor: Actor, id: string): Promise<OpResult> {
  const t = await loadTarget(id);
  const g = guard(actor, t);
  if (g) return g;
  const after = await prisma.user.update({
    where: { id },
    data: { sessionsRevokedAt: new Date() },
    select: SNAPSHOT,
  });
  // Database sessions too, in case any exist from the adapter.
  await prisma.session.deleteMany({ where: { userId: id } });
  await finish(actor, "user.signout", t!, after);
  return { ok: true, message: "Signed out everywhere." };
}

export async function resetTwoFactor(actor: Actor, id: string): Promise<OpResult> {
  const t = await loadTarget(id);
  const g = guard(actor, t);
  if (g) return g;
  if (!t!.totpEnabledAt) return { ok: false, error: "Two-factor sign-in is not turned on for this account." };
  const after = await prisma.user.update({
    where: { id },
    data: { totpSecret: null, totpEnabledAt: null, totpBackupCodes: null },
    select: SNAPSHOT,
  });
  await finish(actor, "user.2fa.reset", t!, after);
  return { ok: true, message: "Two-factor sign-in reset." };
}

export async function verifyEmail(actor: Actor, id: string): Promise<OpResult> {
  const t = await loadTarget(id);
  const g = guard(actor, t);
  if (g) return g;
  if (t!.emailVerified) return { ok: false, error: "Email is already verified." };
  const after = await prisma.user.update({
    where: { id },
    data: { emailVerified: new Date() },
    select: SNAPSHOT,
  });
  await finish(actor, "user.verify_email", t!, after);
  return { ok: true, message: "Email marked as verified." };
}

export async function softDeleteUser(actor: Actor, id: string, note?: string): Promise<OpResult> {
  const t = await loadTarget(id);
  const g = guard(actor, t, { self: true });
  if (g) return g;
  if (t!.deletedAt) return { ok: false, error: "This account is already deleted." };
  const now = new Date();
  const after = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: now,
      sessionsRevokedAt: now,
      // Keep an existing suspension's reason; otherwise mark the ban as the delete.
      banned: true,
      bannedAt: t!.banned ? undefined : now,
      bannedById: t!.banned ? undefined : (actor.id ?? null),
      bannedReason: t!.banned ? undefined : "Account deleted",
    },
    select: SNAPSHOT,
  });
  await prisma.session.deleteMany({ where: { userId: id } });
  await finish(actor, "user.soft_delete", t!, after, note);
  return { ok: true, message: "Account deleted. It can be restored." };
}

export async function restoreUser(actor: Actor, id: string): Promise<OpResult> {
  const t = await loadTarget(id);
  const g = guard(actor, t);
  if (g) return g;
  if (!t!.deletedAt) return { ok: false, error: "This account is not deleted." };
  // Restoring lifts the ban that the delete put on. A separate suspension
  // (reason other than the delete marker) is kept.
  const deleteBan = t!.bannedReason === "Account deleted";
  const after = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
      ...(deleteBan
        ? { banned: false, bannedReason: null, bannedUntil: null, bannedAt: null, bannedById: null }
        : {}),
    },
    select: SNAPSHOT,
  });
  await finish(actor, "user.restore", t!, after);
  return { ok: true, message: deleteBan ? "Account restored." : "Account restored; the earlier suspension still applies." };
}

/** Workspaces where this user is the only OWNER. */
export async function soleOwnedWorkspaces(userId: string): Promise<{ id: string; name: string }[]> {
  const owned = await prisma.workspaceMember.findMany({
    where: { userId, role: "OWNER" },
    select: { workspaceId: true, workspace: { select: { name: true } } },
    take: 500,
  });
  if (owned.length === 0) return [];
  const counts = await prisma.workspaceMember.groupBy({
    by: ["workspaceId"],
    where: { workspaceId: { in: owned.map((o) => o.workspaceId) }, role: "OWNER" },
    _count: { _all: true },
  });
  const n = new Map(counts.map((c) => [c.workspaceId, c._count._all]));
  return owned
    .filter((o) => (n.get(o.workspaceId) ?? 0) <= 1)
    .map((o) => ({ id: o.workspaceId, name: o.workspace.name }));
}

/** What a hard delete would be refused for, or null when it is allowed. */
export async function hardDeleteBlocker(actor: Actor, t: Target): Promise<string | null> {
  if (!actor.isPlatformAdmin) return "Only a platform admin can permanently delete an account.";
  if (actor.id === t.id) return "You cannot delete your own account.";
  if (t.isPlatformAdmin) return "This person holds the platform admin role. Remove the role first.";
  const sole = await soleOwnedWorkspaces(t.id);
  if (sole.length) {
    return `Sole owner of ${sole.map((w) => w.name).join(", ")}. Transfer ownership or delete the workspace first.`;
  }
  return null;
}

/** Same check by id, for showing the reason before the admin tries. */
export async function hardDeleteBlockerFor(actor: Actor, id: string): Promise<string | null> {
  const t = await loadTarget(id);
  return t ? hardDeleteBlocker(actor, t) : "User not found.";
}

/** The text the admin must type to confirm a hard delete. */
export function hardDeleteConfirmText(u: Pick<Snapshot, "email" | "id">): string {
  return u.email ?? u.id;
}

export async function hardDeleteUser(actor: Actor, id: string, confirm: string, note?: string): Promise<OpResult> {
  const t = await loadTarget(id);
  if (!t) return { ok: false, error: "User not found." };
  const blocked = await hardDeleteBlocker(actor, t);
  if (blocked) return { ok: false, error: blocked };
  if (confirm.trim().toLowerCase() !== hardDeleteConfirmText(t).toLowerCase()) {
    return { ok: false, error: "The confirmation text does not match." };
  }
  // Hosted interviews cascade with the user, and so do their recordings.
  const hosted = await prisma.interviewSession.findMany({ where: { userId: id }, select: { id: true } });
  const recordingKeys = await collectRecordingKeys({ interviewSessionIds: hosted.map((s) => s.id) });
  await prisma.user.delete({ where: { id } });
  await deleteRecordingKeys(recordingKeys);
  invalidateSessionStatus(id);
  await logAdminAction({
    actor,
    action: "user.delete",
    targetType: "user",
    targetId: id,
    targetLabel: label(t),
    before: { ...audit(t), name: t.name, email: t.email, userType: t.userType },
    after: null,
    note: note ?? "Permanent delete",
  });
  refresh(id);
  return { ok: true, message: "Account permanently deleted." };
}

export type ProfilePatch = {
  name?: string | null;
  email?: string;
  bio?: string | null;
  hireMeUrl?: string | null;
  portfolioPublic?: boolean;
};

export async function updateProfile(actor: Actor, id: string, patch: ProfilePatch): Promise<OpResult & { status?: number }> {
  const before = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, bio: true, hireMeUrl: true, portfolioPublic: true },
  });
  if (!before) return { ok: false, error: "User not found.", status: 404 };
  if (actor.id !== id) {
    const isAdmin = (await prisma.userRole.count({ where: { userId: id, role: { key: "PLATFORM_ADMIN" } } })) > 0;
    if (isAdmin && !actor.isPlatformAdmin) {
      return { ok: false, error: "Only a platform admin can edit another platform admin.", status: 403 };
    }
  }
  if (patch.email !== undefined && patch.email !== before.email) {
    const taken = await prisma.user.findFirst({
      where: { email: { equals: patch.email, mode: "insensitive" }, NOT: { id } },
      select: { id: true },
    });
    if (taken) return { ok: false, error: "Another account already uses this email.", status: 409 };
  }
  const after = await prisma.user.update({
    where: { id },
    data: patch,
    select: { id: true, name: true, email: true, bio: true, hireMeUrl: true, portfolioPublic: true },
  });
  const changed = (Object.keys(patch) as (keyof ProfilePatch)[]).filter((k) => before[k] !== after[k]);
  if (changed.length) {
    const pick = (o: typeof before) => Object.fromEntries(changed.map((k) => [k, o[k]]));
    await logAdminAction({
      actor,
      action: "user.update",
      targetType: "user",
      targetId: id,
      targetLabel: before.email ?? before.name ?? id,
      before: pick(before),
      after: pick(after),
    });
  }
  refresh(id);
  return { ok: true, message: changed.length ? "Saved." : "Nothing changed." };
}
