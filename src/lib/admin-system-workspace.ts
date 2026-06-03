import { prisma } from "@/lib/prisma";

/**
 * The McpAuditLog model has a non-nullable workspaceId FK that cascades on
 * delete. Platform-level actions (HITL approvals from the Gemma Copilot,
 * cron-driven anomaly resolutions, scheduled scans) don't belong to any
 * customer workspace, so we keep a single synthetic "system" workspace and
 * point those audit rows at it.
 *
 * The id is hardcoded so callers can use it directly without a lookup. We
 * use upsert so the row materializes on first access in fresh databases or
 * test environments — no separate seed step required.
 */
export const SYSTEM_ADMIN_WORKSPACE_ID = "system-admin-space";
export const SYSTEM_ADMIN_WORKSPACE_SLUG = "system-admin-space";

let ensuredOnce = false;

/**
 * Ensure the platform's synthetic admin workspace exists. Cheap on the hot
 * path: after the first successful call within a process, subsequent calls
 * return immediately without hitting the database.
 *
 * Returns the canonical workspace id so callers can pass it straight into
 * Prisma writes.
 */
export async function ensureSystemAdminWorkspace(): Promise<string> {
  if (ensuredOnce) return SYSTEM_ADMIN_WORKSPACE_ID;

  await prisma.workspace.upsert({
    where: { id: SYSTEM_ADMIN_WORKSPACE_ID },
    update: {},
    create: {
      id: SYSTEM_ADMIN_WORKSPACE_ID,
      slug: SYSTEM_ADMIN_WORKSPACE_SLUG,
      name: "Platform System (Gemma Copilot)",
      planName: "INTERNAL",
    },
  });

  ensuredOnce = true;
  return SYSTEM_ADMIN_WORKSPACE_ID;
}
