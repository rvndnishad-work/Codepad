"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin/audit";
import { requireStaff } from "../content/_lib/guard";
import { fail, ok, type ActionResult } from "../content/_lib/result";
import { deleteTarget, hideTarget } from "../community/_lib/targets";

async function load(id: string) {
  return prisma.snippet.findUnique({ where: { id }, select: { id: true, title: true, slug: true, visibility: true, pinned: true, userId: true } });
}

/** Make an abusive public snippet private: it leaves Explore and its link stops working for others. */
export async function unlistSnippet(id: string, note: string): Promise<ActionResult> {
  const { actor } = await requireStaff("content:curate");
  if (!note.trim()) return fail("Add a reason.");
  const s = await load(id);
  if (!s) return fail("Snippet not found.");
  await hideTarget("snippet", id);
  await logAdminAction({
    actor,
    action: "content.snippet.unlist",
    targetType: "snippet",
    targetId: id,
    targetLabel: s.title,
    before: { visibility: s.visibility, pinned: s.pinned },
    after: { visibility: "private", pinned: false },
    note,
  });
  revalidatePath("/admin/snippets");
  revalidatePath("/explore");
  return ok();
}

export async function deleteSnippet(id: string, note: string): Promise<ActionResult> {
  const { actor } = await requireStaff("content:curate");
  if (!note.trim()) return fail("Add a reason.");
  const s = await load(id);
  if (!s) return fail("Snippet not found.");
  await deleteTarget("snippet", id);
  await logAdminAction({
    actor,
    action: "content.snippet.delete",
    targetType: "snippet",
    targetId: id,
    targetLabel: s.title,
    before: s,
    note,
  });
  revalidatePath("/admin/snippets");
  revalidatePath("/explore");
  return ok();
}
