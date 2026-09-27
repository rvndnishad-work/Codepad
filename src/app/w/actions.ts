"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { joinWorkspaceWithoutInvite, type JoinResult } from "@/lib/workspace/join";

/** Join a workspace that lets people with this email domain in without an invite. */
export async function joinWorkspaceAction(slug: string): Promise<JoinResult> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { ok: false, error: "You are signed out. Sign in and try again." };
  if (typeof slug !== "string" || !slug) return { ok: false, error: "This workspace cannot be joined." };
  const res = await joinWorkspaceWithoutInvite({ id: session.user.id, email: session.user.email }, slug);
  if (res.ok) revalidatePath("/w");
  return res;
}
