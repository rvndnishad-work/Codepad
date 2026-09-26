import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";

/** The signed-in member viewing a Connections page. Anyone in the workspace can view. */
export async function connectionsViewer(slug: string, path: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/${path}`)}`);
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");
  const [canManage, canSendAi, canSendTakeHome] = await Promise.all([
    canMember(member, "integration:manage"),
    canMember(member, "interview:conduct"),
    canMember(member, "takehome:create"),
  ]);
  return {
    workspace,
    member,
    growth: growthToolsEnabled(workspace),
    canManage,
    canSend: canSendAi || canSendTakeHome,
  };
}
