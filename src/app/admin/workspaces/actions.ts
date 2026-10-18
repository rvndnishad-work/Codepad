"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { changePlan } from "@/lib/admin/workspace-actions";

/**
 * Change a workspace plan. Goes through Stripe and the audit log (see
 * changePlan in src/lib/admin/workspace-actions.ts). The old hard delete and
 * the LOCKED plan are gone: use Lock and Schedule deletion on the workspace
 * page instead.
 */
export async function updateWorkspacePlanAction(workspaceId: string, planName: string, note: string) {
  const session = await requireAdminAccess("platform:admin");
  const res = await changePlan({ actor: { id: session?.user?.id, email: session?.user?.email } }, workspaceId, planName, note);
  if (res.ok) revalidatePath("/admin/workspaces", "layout");
  return res;
}
