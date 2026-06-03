"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Site Admin Action: Manually override a B2B workspace's subscription tier.
 */
export async function updateWorkspacePlanAction(workspaceId: string, planName: string) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }

  if (!workspaceId || !planName) {
    throw new Error("Missing workspace ID or plan name.");
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { planName },
  });

  revalidatePath("/admin/workspaces");
  return { success: true };
}

/**
 * Site Admin Action: Hard delete a workspace for support cleanups or non-payment.
 */
export async function deleteWorkspaceAction(workspaceId: string) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    throw new Error("Unauthorized: Platform administrator access required.");
  }

  if (!workspaceId) {
    throw new Error("Missing workspace ID.");
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  revalidatePath("/admin/workspaces");
  return { success: true };
}
