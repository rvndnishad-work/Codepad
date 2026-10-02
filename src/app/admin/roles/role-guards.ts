/**
 * Pure guard rules for the /admin/roles editor, kept free of Prisma and auth
 * so they can be unit tested. The server actions load the facts and call
 * these; a non-null return is the refusal message.
 */

export const PLATFORM_ADMIN_KEY = "PLATFORM_ADMIN";

/** System roles are defined by the seed. Their permission sets are the
 *  contract the code relies on, so the editor must never change them. */
export function permissionEditRefusal(role: { isSystem: boolean; key: string }): string | null {
  if (role.isSystem) {
    return `${role.key} is a system role; its permissions are managed by the seed and cannot be edited here.`;
  }
  return null;
}

/**
 * Removing a PLATFORM_ADMIN assignment is refused when it would lock the
 * platform out (last holder) or when an admin tries to demote themselves
 * (another admin has to do it).
 */
export function unassignRefusal(input: {
  roleKey: string;
  targetUserId: string;
  actorUserId: string | null | undefined;
  /** How many users hold this role right now, including the target. */
  holderCount: number;
}): string | null {
  if (input.roleKey !== PLATFORM_ADMIN_KEY) return null;
  if (input.actorUserId && input.actorUserId === input.targetUserId) {
    return "You cannot remove your own platform admin role. Ask another platform admin.";
  }
  if (input.holderCount <= 1) {
    return "This is the last platform admin. Grant the role to someone else first.";
  }
  return null;
}

/** Normalise an email the same way for lookup and display. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
