import "server-only";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import type { Permission } from "@/lib/permissions/permissions";
import type { AdminActor } from "@/lib/admin/audit";

export type StaffContext = { userId: string | null; actor: AdminActor };

/**
 * Resolve the signed-in staff member for a server action or route, or null
 * when they lack `permission`. Callers turn null into a 403 or an error.
 */
export async function staffContext(permission: Permission): Promise<StaffContext | null> {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, permission))) return null;
  return {
    userId: session?.user?.id ?? null,
    actor: { id: session?.user?.id ?? null, email: session?.user?.email ?? null },
  };
}

/** Same as staffContext but throws, for server actions. */
export async function requireStaff(permission: Permission): Promise<StaffContext> {
  const ctx = await staffContext(permission);
  if (!ctx) throw new Error("Forbidden");
  return ctx;
}
