"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { staffCan } from "@/lib/permissions/staff";
import { isPermissionGrant } from "@/lib/permissions/permissions";
import { logAdminAction } from "@/lib/admin/audit";
import { normaliseEmail, permissionEditRefusal, unassignRefusal } from "./role-guards";
import { z } from "zod";

/**
 * Server actions backing the /admin/roles editor. Managing roles is itself a
 * platform-admin capability — only PLATFORM_ADMIN may create/edit/assign roles,
 * otherwise a moderator could grant themselves more permissions. Every action
 * re-checks platform:admin (defense in depth; the page also gates) and writes
 * an audit row.
 */
async function assertPlatformAdmin() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: platform administrator access required.");
  }
  return { id: session?.user?.id ?? null, email: session?.user?.email ?? null };
}

/** Replace a role's permission set. Each entry must be a known permission or a
 *  valid wildcard ("*" / "resource:*") so the DB never carries an unenforceable
 *  grant. System roles are refused: the seed owns their permissions. */
export async function setRolePermissionsAction(
  roleId: string,
  permissions: string[],
) {
  const actor = await assertPlatformAdmin();
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, key: true, isSystem: true, permissions: { select: { permission: true } } },
  });
  if (!role) throw new Error("Role not found.");
  const refusal = permissionEditRefusal(role);
  if (refusal) throw new Error(refusal);

  const unique = [...new Set(permissions)];
  const invalid = unique.filter((p) => !isPermissionGrant(p));
  if (invalid.length) {
    throw new Error(`Unknown permission(s): ${invalid.join(", ")}`);
  }
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: unique.map((permission) => ({ roleId, permission })),
      skipDuplicates: true,
    }),
  ]);
  await logAdminAction({
    actor,
    action: "role.permissions",
    targetType: "role",
    targetId: role.id,
    targetLabel: role.key,
    before: role.permissions.map((p) => p.permission).sort(),
    after: [...unique].sort(),
  });
  revalidatePath("/admin/roles");
}

const createSchema = z.object({
  key: z.string().min(2).max(40),
  label: z.string().min(2).max(60),
  scope: z.enum(["GLOBAL", "WORKSPACE"]),
  description: z.string().max(200).optional(),
});

/** Create a custom (non-system) role. Key is normalised to UPPER_SNAKE. */
export async function createRoleAction(input: {
  key: string;
  label: string;
  scope: "GLOBAL" | "WORKSPACE";
  description?: string;
}) {
  const actor = await assertPlatformAdmin();
  const parsed = createSchema.parse(input);
  const key = parsed.key
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  const existing = await prisma.role.findUnique({ where: { key } });
  if (existing) throw new Error(`A role with key "${key}" already exists.`);
  const created = await prisma.role.create({
    data: {
      key,
      label: parsed.label.trim(),
      scope: parsed.scope,
      description: parsed.description?.trim() || null,
      isSystem: false,
    },
  });
  await logAdminAction({
    actor,
    action: "role.create",
    targetType: "role",
    targetId: created.id,
    targetLabel: key,
    after: { key, label: created.label, scope: created.scope },
  });
  revalidatePath("/admin/roles");
}

/** Delete a custom role. System roles are protected. */
export async function deleteRoleAction(roleId: string) {
  const actor = await assertPlatformAdmin();
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { key: true, label: true, scope: true, isSystem: true },
  });
  if (!role) throw new Error("Role not found.");
  if (role.isSystem) throw new Error("System roles cannot be deleted.");
  await prisma.role.delete({ where: { id: roleId } });
  await logAdminAction({
    actor,
    action: "role.delete",
    targetType: "role",
    targetId: roleId,
    targetLabel: role.key,
    before: { key: role.key, label: role.label, scope: role.scope },
  });
  revalidatePath("/admin/roles");
}

/** Grant a GLOBAL role to a user by email (matched case-insensitively).
 *  (Workspace roles are assigned per workspace via the members UI, not here.) */
export async function assignRoleAction(email: string, roleId: string) {
  const actor = await assertPlatformAdmin();
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { key: true, scope: true },
  });
  if (!role) throw new Error("Role not found.");
  if (role.scope !== "GLOBAL") {
    throw new Error("Only global roles are assigned to users here.");
  }
  const wanted = normaliseEmail(email);
  if (!wanted) throw new Error("Enter an email.");
  // Stored emails are not guaranteed lowercase (older OAuth sign-ups), so
  // match case-insensitively. Ambiguous matches are refused, not guessed.
  const users = await prisma.user.findMany({
    where: { email: { equals: wanted, mode: "insensitive" } },
    select: { id: true, email: true },
    take: 2,
  });
  if (users.length === 0) throw new Error("No user with that email.");
  if (users.length > 1) {
    throw new Error(
      "More than one account matches that email in different letter case. Fix the accounts first.",
    );
  }
  const user = users[0];
  const existing = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: user.id, roleId } },
    select: { id: true },
  });
  if (existing) return;
  await prisma.userRole.create({ data: { userId: user.id, roleId } });
  await logAdminAction({
    actor,
    action: "role.assign",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.email,
    after: { role: role.key },
  });
  revalidatePath("/admin/roles");
}

/** Remove a global role assignment. PLATFORM_ADMIN cannot be removed from
 *  yourself or from its last holder. */
export async function unassignRoleAction(userRoleId: string) {
  const actor = await assertPlatformAdmin();
  const removed = await prisma.$transaction(
    async (tx) => {
      const ur = await tx.userRole.findUnique({
        where: { id: userRoleId },
        select: {
          id: true,
          userId: true,
          roleId: true,
          role: { select: { key: true } },
          user: { select: { email: true } },
        },
      });
      if (!ur) throw new Error("That assignment no longer exists.");
      const holderCount = await tx.userRole.count({ where: { roleId: ur.roleId } });
      const refusal = unassignRefusal({
        roleKey: ur.role.key,
        targetUserId: ur.userId,
        actorUserId: actor.id,
        holderCount,
      });
      if (refusal) throw new Error(refusal);
      await tx.userRole.delete({ where: { id: ur.id } });
      return ur;
    },
    // Serializable so two admins removing each other at once cannot both
    // pass the "not the last holder" check.
    { isolationLevel: "Serializable" },
  );
  await logAdminAction({
    actor,
    action: "role.unassign",
    targetType: "user",
    targetId: removed.userId,
    targetLabel: removed.user.email,
    before: { role: removed.role.key },
  });
  revalidatePath("/admin/roles");
}
