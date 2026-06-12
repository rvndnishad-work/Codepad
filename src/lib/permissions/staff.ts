/**
 * Staff / platform-scope authorization helpers — the global counterpart to the
 * workspace `canMember` family. These resolve a user's GLOBAL role permissions
 * (via loadUserPermissions) and answer "can this session reach this admin
 * surface?".
 *
 * Server-only: imports `auth` and `next/navigation`. Deliberately NOT
 * re-exported from the permissions barrel so it can never be pulled into a
 * client bundle — import it directly from "@/lib/permissions/staff".
 *
 * Replaces the binary `isAdmin(session)` env-allowlist gate. Existing admins
 * keep full access because the role seed backfills PLATFORM_ADMIN to every
 * ADMIN_EMAILS user; new MODERATOR / CONTENT_MANAGER roles now reach only the
 * surfaces their permissions allow.
 */
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { loadUserPermissions } from "./access";
import { PLATFORM_PERMISSIONS, type Permission } from "./permissions";

type SessionLike = { user?: { id?: string | null } | null } | null | undefined;

async function permsFor(session: SessionLike): Promise<ReadonlySet<Permission>> {
  const id = session?.user?.id;
  if (!id) return new Set<Permission>();
  return loadUserPermissions(id);
}

/** Does this session hold the given platform permission? */
export async function staffCan(
  session: SessionLike,
  permission: Permission,
): Promise<boolean> {
  return (await permsFor(session)).has(permission);
}

/** Any platform-scope access at all — the gate for entering the /admin console.
 *  True for PLATFORM_ADMIN, MODERATOR, CONTENT_MANAGER, etc.; false for plain
 *  users and creators (whose permissions are all creator-scoped). */
export async function isStaff(session: SessionLike): Promise<boolean> {
  const perms = await permsFor(session);
  return PLATFORM_PERMISSIONS.some((p) => perms.has(p));
}

/**
 * Page/route guard: resolve the session and 404 unless it holds `permission`.
 * Defaults to `platform:admin` so a surface that forgets to specify a narrower
 * permission fails closed to full-admin-only. Returns the session for reuse.
 *
 *   export default async function AdminUsersPage() {
 *     await requireAdminAccess("user:manage");
 *     ...
 *   }
 */
export async function requireAdminAccess(
  permission: Permission = "platform:admin",
) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, permission))) notFound();
  return session;
}
