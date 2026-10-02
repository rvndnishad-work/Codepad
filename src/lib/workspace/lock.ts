/**
 * Admin lock (Workspace.lockedAt). While a workspace is locked its members
 * are refused at /w/[slug] and its candidate links show a notice instead of
 * the take-home, screening or interview. Data is kept. Set and cleared only
 * from /admin/workspaces/[id] (src/lib/admin/workspace-actions.ts).
 */
import { prisma } from "@/lib/prisma";

export function workspaceIsLocked(ws: { lockedAt?: Date | null } | null | undefined): boolean {
  return !!ws?.lockedAt;
}

/** Looks the lock up by id or slug. Unknown or missing workspaces are not locked. */
export async function isWorkspaceLocked(where: { id?: string | null; slug?: string | null } | null | undefined): Promise<boolean> {
  if (!where) return false;
  if (where.id) return workspaceIsLocked(await prisma.workspace.findUnique({ where: { id: where.id }, select: { lockedAt: true } }));
  if (where.slug) return workspaceIsLocked(await prisma.workspace.findUnique({ where: { slug: where.slug }, select: { lockedAt: true } }));
  return false;
}
