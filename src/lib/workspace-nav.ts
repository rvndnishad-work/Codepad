import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Resolve a user's "best" workspace slug for navbar deep-links.
 *
 * Wrapped in React `cache()` so repeated calls within a single server request
 * (e.g. the root-layout Header plus any nested layout that needs the same
 * link) collapse to one DB round-trip. Returns null for users with no
 * workspace membership.
 *
 * We don't cache this in the JWT because workspace membership changes mid-
 * session (a recruiter creating their first workspace, or being invited to
 * one) must reflect in the nav without forcing a re-login.
 */
export const getPrimaryWorkspaceSlug = cache(async function getPrimaryWorkspaceSlug(
  userId: string,
): Promise<string | null> {
  const firstMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { workspace: { name: "asc" } },
    select: { workspace: { select: { slug: true } } },
  });
  return firstMembership?.workspace.slug ?? null;
});
