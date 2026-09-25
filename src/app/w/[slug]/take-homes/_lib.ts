/**
 * Access shared by every Take home page: signed in and a member of the
 * workspace. Take-homes are on every plan. Server-only.
 */
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";

export type TakeHomeAccess = {
  workspace: { id: string; name: string; slug: string };
  userId: string;
  /** Send, remind, extend, cancel and edit templates. */
  canCreate: boolean;
  /** Pass or not pass the candidate. */
  canDecide: boolean;
};

export async function loadTakeHomeAccess(slug: string, path: string): Promise<TakeHomeAccess> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(path)}`);
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      members: { where: { userId: session.user.id }, select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();
  const member = workspace.members[0];
  if (!member) redirect("/dashboard");
  const [canCreate, canDecide] = await Promise.all([canMember(member, "takehome:create"), canMember(member, "candidate:write")]);
  return { workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug }, userId: session.user.id, canCreate, canDecide };
}

/** Template names for filters and pickers, newest first. */
export async function loadTemplateOptions(workspaceId: string): Promise<{ id: string; name: string }[]> {
  return prisma.takeHomeTemplate.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
}
