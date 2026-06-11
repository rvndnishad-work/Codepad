import { requireAdminAccess } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  PLATFORM_PERMISSIONS,
  CREATOR_PERMISSIONS,
  WORKSPACE_PERMISSIONS,
} from "@/lib/permissions/permissions";
import RolesConsole from "./RolesConsole";

export const metadata = {
  title: "Roles & Permissions — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminRolesPage() {
  // Managing roles is the most privileged admin surface — full platform admins
  // only. (A moderator reaching this could otherwise escalate themselves.)
  await requireAdminAccess("platform:admin");

  const roles = await prisma.role.findMany({
    orderBy: [{ scope: "asc" }, { key: "asc" }],
    include: {
      permissions: { select: { permission: true } },
      userRoles: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const shaped = roles.map((r) => ({
    id: r.id,
    key: r.key,
    label: r.label,
    scope: r.scope,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.permissions.map((p) => p.permission),
    members: r.userRoles.map((ur) => ({
      userRoleId: ur.id,
      userId: ur.user.id,
      name: ur.user.name,
      email: ur.user.email,
    })),
  }));

  return (
    <RolesConsole
      roles={shaped}
      permissionGroups={{
        workspace: [...WORKSPACE_PERMISSIONS],
        platform: [...PLATFORM_PERMISSIONS],
        creator: [...CREATOR_PERMISSIONS],
      }}
      allPermissions={[...PERMISSIONS]}
    />
  );
}
