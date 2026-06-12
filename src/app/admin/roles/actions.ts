"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { staffCan } from "@/lib/permissions/staff";
import { isPermissionGrant } from "@/lib/permissions/permissions";
import { z } from "zod";

/**
 * Server actions backing the /admin/roles editor. Managing roles is itself a
 * platform-admin capability — only PLATFORM_ADMIN may create/edit/assign roles,
 * otherwise a moderator could grant themselves more permissions. Every action
 * re-checks platform:admin (defense in depth; the page also gates).
 */
async function assertPlatformAdmin() {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "platform:admin"))) {
    throw new Error("Unauthorized: platform administrator access required.");
  }
}

/** Replace a role's permission set. Each entry must be a known permission or a
 *  valid wildcard ("*" / "resource:*") so the DB never carries an unenforceable
 *  grant. */
export async function setRolePermissionsAction(
  roleId: string,
  permissions: string[],
) {
  await assertPlatformAdmin();
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
  await assertPlatformAdmin();
  const parsed = createSchema.parse(input);
  const key = parsed.key
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  const existing = await prisma.role.findUnique({ where: { key } });
  if (existing) throw new Error(`A role with key "${key}" already exists.`);
  await prisma.role.create({
    data: {
      key,
      label: parsed.label.trim(),
      scope: parsed.scope,
      description: parsed.description?.trim() || null,
      isSystem: false,
    },
  });
  revalidatePath("/admin/roles");
}

/** Delete a custom role. System roles are protected. */
export async function deleteRoleAction(roleId: string) {
  await assertPlatformAdmin();
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true },
  });
  if (!role) throw new Error("Role not found.");
  if (role.isSystem) throw new Error("System roles cannot be deleted.");
  await prisma.role.delete({ where: { id: roleId } });
  revalidatePath("/admin/roles");
}

/** Grant a GLOBAL role to a user by email. (Workspace roles are assigned per
 *  workspace via the members UI, not here.) */
export async function assignRoleAction(email: string, roleId: string) {
  await assertPlatformAdmin();
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { scope: true },
  });
  if (!role) throw new Error("Role not found.");
  if (role.scope !== "GLOBAL") {
    throw new Error("Only global roles are assigned to users here.");
  }
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true },
  });
  if (!user) throw new Error("No user with that email.");
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId } },
    update: {},
    create: { userId: user.id, roleId },
  });
  revalidatePath("/admin/roles");
}

/** Remove a global role assignment. */
export async function unassignRoleAction(userRoleId: string) {
  await assertPlatformAdmin();
  await prisma.userRole.delete({ where: { id: userRoleId } });
  revalidatePath("/admin/roles");
}
