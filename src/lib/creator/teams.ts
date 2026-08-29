import { prisma } from "@/lib/prisma";

/**
 * Team permission helper for multi-space.
 * Roles: OWNER (space.ownerId) > ADMIN > EDITOR > VIEWER
 * OWNER implicitly has all. ADMIN can edit/publish/members/domain.
 * EDITOR can edit/publish. VIEWER read-only.
 */
export type SpaceRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type SpacePermission = "space:edit" | "space:publish" | "space:members" | "space:domain" | "space:view";

const ROLE_PERMS: Record<SpaceRole, SpacePermission[]> = {
  OWNER: ["space:edit", "space:publish", "space:members", "space:domain", "space:view"],
  ADMIN: ["space:edit", "space:publish", "space:members", "space:domain", "space:view"],
  EDITOR: ["space:edit", "space:publish", "space:view"],
  VIEWER: ["space:view"],
};

export async function getSpaceRole(spaceId: string, userId: string): Promise<SpaceRole | null> {
  const space = await prisma.creatorSpace.findUnique({ where: { id: spaceId }, select: { ownerId: true } });
  if (!space) return null;
  if (space.ownerId === userId) return "OWNER";
  const member = await prisma.spaceMember.findUnique({ where: { spaceId_userId: { spaceId, userId } }, select: { role: true } });
  if (!member) return null;
  if (["OWNER", "ADMIN", "EDITOR", "VIEWER"].includes(member.role)) return member.role as SpaceRole;
  return null;
}

export async function can(spaceId: string, userId: string, perm: SpacePermission): Promise<boolean> {
  const role = await getSpaceRole(spaceId, userId);
  if (!role) return false;
  return ROLE_PERMS[role].includes(perm);
}

/** Require helper — throws if not allowed. */
export async function requireSpaceAccess(spaceId: string, userId: string, perm: SpacePermission): Promise<void> {
  if (!(await can(spaceId, userId, perm))) throw new Error(`Forbidden: ${perm} required.`);
}
