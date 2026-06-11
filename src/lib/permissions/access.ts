/**
 * DB-backed adapters that turn a user / workspace-member into a resolved
 * {@link Subject} the pure `can()` primitive can decide on. Server-only.
 *
 * Reads are memoized per request with React `cache()` (same technique as
 * `src/lib/auth.ts`'s `cache(uncachedAuth)`): a single page render checks
 * permissions in the layout, the page, and nested components — without
 * memoization that's N identical role queries per navigation.
 */
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { type Permission } from "./permissions";
import {
  resolveEffective,
  asOverrides,
  can,
  type Subject,
  type OwnedResource,
} from "./resolve";

/** Thrown by `requirePermission`. Call sites that prefer a 403 over an
 *  exception can use `can()` directly and shape their own response. */
export class PermissionError extends Error {
  readonly permission: Permission;
  readonly code = "FORBIDDEN" as const;
  constructor(permission: Permission) {
    super(`Missing required permission: ${permission}`);
    this.name = "PermissionError";
    this.permission = permission;
  }
}

/** Per-request map of every role key → its raw permission strings. One query
 *  serves all workspace-role resolution within a request. */
export const loadRolePermissions = cache(
  async (): Promise<Map<string, string[]>> => {
    const roles = await prisma.role.findMany({
      select: { key: true, permissions: { select: { permission: true } } },
    });
    const map = new Map<string, string[]>();
    for (const r of roles) {
      map.set(
        r.key,
        r.permissions.map((p) => p.permission),
      );
    }
    return map;
  },
);

/** Effective GLOBAL permission set for a user: union of all their global
 *  roles' permissions, then their personal delta overrides. */
export const loadUserPermissions = cache(
  async (userId: string): Promise<Set<Permission>> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        permissionOverrides: true,
        roles: {
          select: {
            role: {
              select: {
                scope: true,
                permissions: { select: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return new Set<Permission>();
    const lists = user.roles
      .filter((ur) => ur.role.scope === "GLOBAL")
      .map((ur) => ur.role.permissions.map((p) => p.permission));
    return resolveEffective(lists, asOverrides(user.permissionOverrides));
  },
);

/** Build a global Subject for `can()`. Anonymous users get an empty set. */
export async function getGlobalSubject(
  userId: string | null | undefined,
): Promise<Subject> {
  if (!userId) return { userId, permissions: new Set<Permission>() };
  return { userId, permissions: await loadUserPermissions(userId) };
}

/** Convenience: does this user hold `permission` at the platform/creator
 *  scope (optionally against an owned `resource`)? */
export async function userCan(
  userId: string | null | undefined,
  permission: Permission,
  resource?: OwnedResource,
): Promise<boolean> {
  return can(await getGlobalSubject(userId), permission, resource);
}

export type WorkspaceMemberAccess = {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  /** Resolved effective workspace permissions (role base ± member overrides). */
  subject: Subject;
};

/**
 * Load a workspace member with their effective permissions resolved. Returns
 * null when the user is not a member of the workspace. This is the ONE loader
 * every `/w/[slug]` authorization check should go through — it guarantees the
 * member's `permissions` override column is read and resolved consistently.
 */
export async function loadWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMemberAccess | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
      permissions: true,
    },
  });
  if (!member) return null;
  const roleMap = await loadRolePermissions();
  const base = roleMap.get(member.role) ?? [];
  const permissions = resolveEffective([base], asOverrides(member.permissions));
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    subject: { userId, permissions },
  };
}

/**
 * Ergonomic workspace check for call sites that already hold a member row
 * (with `role` and the `permissions` override column). Resolves the member's
 * effective permissions via the per-request-cached role map and reports
 * whether they hold `permission`. This is the one-line replacement for the
 * old `member.role === "OWNER" || member.role === "ADMIN"` checks:
 *
 *   if (!member || !(await canMember(member, "integration:manage"))) { 403 }
 */
export async function canMember(
  member: { role: string; permissions?: unknown },
  permission: Permission,
): Promise<boolean> {
  const roleMap = await loadRolePermissions();
  const base = roleMap.get(member.role) ?? [];
  return resolveEffective([base], asOverrides(member.permissions)).has(
    permission,
  );
}

/** Throw {@link PermissionError} unless the subject holds `permission`. For
 *  server actions that want a hard fail rather than a branch. */
export function requirePermission(
  subject: Subject,
  permission: Permission,
  resource?: OwnedResource,
): void {
  if (!can(subject, permission, resource)) {
    throw new PermissionError(permission);
  }
}
