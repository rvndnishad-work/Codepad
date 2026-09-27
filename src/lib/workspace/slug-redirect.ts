/**
 * Old workspace web addresses. When a workspace changes its address in
 * Settings > General, links to the old one (bookmarks, emails already sent,
 * candidate interview links) keep working by sending people to the same page
 * at the new address. Server only.
 */
import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { movedSlugPath, REQUEST_PATH_HEADER } from "./screening-defaults";

/** The current address of a workspace that used to live at `oldSlug`, or null. */
export async function movedWorkspaceSlug(oldSlug: string): Promise<string | null> {
  if (!oldSlug) return null;
  const moved = await prisma.workspaceSlugRedirect.findUnique({
    where: { oldSlug },
    select: { workspace: { select: { slug: true } } },
  });
  return moved && moved.workspace.slug !== oldSlug ? moved.workspace.slug : null;
}

/**
 * Where to send a page request that used an old address: the same path and
 * query at the new address. `fallback` is used when the proxy did not pass
 * the path (it always does for /w/ pages).
 */
export async function movedPagePath(oldSlug: string, newSlug: string, fallback?: string): Promise<string> {
  let asked: string | null = null;
  try {
    asked = (await headers()).get(REQUEST_PATH_HEADER);
  } catch {
    asked = null;
  }
  return movedSlugPath(asked ?? fallback ?? null, oldSlug, newSlug);
}
