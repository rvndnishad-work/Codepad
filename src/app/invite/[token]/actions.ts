"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/**
 * Accept a workspace invite (IP-73). Creates the WorkspaceMember only here,
 * after verifying the signed-in user's email matches the invited email. Safe
 * to call twice — an already-accepted invite or existing membership is a no-op.
 */
export async function acceptWorkspaceInviteAction(token: string): Promise<{ slug: string }> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Please sign in to accept this invite.");

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, slug: true, planName: true, stripeSubscriptionId: true } } },
  });
  if (!invite) throw new Error("This invite link is invalid.");
  if (invite.expiresAt.getTime() < Date.now()) throw new Error("This invite has expired.");

  const email = (session.user.email ?? "").toLowerCase();
  if (email !== invite.email.toLowerCase()) {
    throw new Error(`This invite was sent to ${invite.email}. Sign in with that email to accept.`);
  }

  // Idempotent: if they're already a member, just mark the invite accepted.
  const existing = await prisma.workspaceMember.findFirst({
    where: { workspaceId: invite.workspace.id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspace.id,
          userId: session.user.id,
          role: invite.role,
        },
      }),
      prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    // Scale Stripe seats for a paid workspace (best-effort).
    if (invite.workspace.planName === "GROWTH" && invite.workspace.stripeSubscriptionId) {
      try {
        const count = await prisma.workspaceMember.count({ where: { workspaceId: invite.workspace.id } });
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(invite.workspace.stripeSubscriptionId);
        const itemId = sub.items.data[0]?.id;
        if (itemId) await stripe.subscriptionItems.update(itemId, { quantity: count });
      } catch (err) {
        console.error("[ws-invite-accept] Stripe seat scale failed:", err);
      }
    }
  } else {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  }

  return { slug: invite.workspace.slug };
}
