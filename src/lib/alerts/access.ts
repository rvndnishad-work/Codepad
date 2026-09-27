/**
 * Who may change Slack and Teams alerts: workspace members with
 * integration:manage on a plan with growth tools. Server only.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";

export async function requireAlertsAdmin(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Sign in to continue.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("You are not a member of this workspace.");
  if (!growthToolsEnabled(workspace)) throw new Error("Slack and Teams alerts are part of the Growth plan.");
  if (!(await canMember(member, "integration:manage"))) {
    throw new Error("Only workspace owners and admins can manage alerts.");
  }
  return {
    workspace,
    userId: session.user.id,
    actor: { workspaceId: workspace.id, actorUserId: session.user.id, actorEmail: session.user.email ?? null },
  };
}
