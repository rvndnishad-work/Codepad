/**
 * Joining a workspace without an invite (Settings > Security, "Join without
 * an invite"). A signed-in person whose email is at one of the workspace's
 * allowed domains can join at the role the workspace picked. Seats still
 * count, and the join is audited as MEMBER_JOINED with via "domain".
 *
 * Emails are verified before an account exists (a code for email sign-up,
 * the provider for GitHub and Google), so the domain of the signed-in email
 * is trusted here.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { seatUsage } from "@/lib/workspace/members";
import { canJoinWithoutInvite, normalizeWorkspaceSettings } from "./settings";
import { domainSuffixes } from "./security";
import { seatItem } from "@/lib/video/addon";

export type JoinableWorkspace = { name: string; slug: string; role: string; members: number };

/** Workspaces this person could join without an invite, and is not in yet. */
export async function findJoinableWorkspaces(userId: string, email: string | null | undefined): Promise<JoinableWorkspace[]> {
  const suffixes = email ? domainSuffixes(email) : [];
  if (!email || !suffixes.length) return [];
  const rows = await prisma.workspace.findMany({
    where: {
      joinWithoutInvite: true,
      allowedEmailDomains: { hasSome: suffixes },
      deletionScheduledAt: null,
      members: { none: { userId } },
    },
    select: { name: true, slug: true, joinWithoutInvite: true, allowedEmailDomains: true, joinRole: true, _count: { select: { members: true } } },
    orderBy: { name: "asc" },
    take: 20,
  });
  return rows
    .filter((w) => !w.slug.startsWith("__") && canJoinWithoutInvite(normalizeWorkspaceSettings(w), email))
    .map((w) => ({ name: w.name, slug: w.slug, role: normalizeWorkspaceSettings(w).joinRole, members: w._count.members }));
}

export type JoinResult = { ok: true; slug: string } | { ok: false; error: string };

/** Add the person to the workspace at its join role, if the workspace allows it. */
export async function joinWorkspaceWithoutInvite(
  user: { id: string; email: string | null | undefined },
  slug: string,
  now: Date = new Date(),
): Promise<JoinResult> {
  const email = user.email?.trim().toLowerCase() ?? "";
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      joinWithoutInvite: true,
      allowedEmailDomains: true,
      joinRole: true,
      deletionScheduledAt: true,
      members: { select: { userId: true } },
    },
  });
  if (!ws || ws.slug.startsWith("__") || ws.deletionScheduledAt) return { ok: false, error: "This workspace cannot be joined." };
  if (ws.members.some((m) => m.userId === user.id)) return { ok: true, slug: ws.slug };

  const settings = normalizeWorkspaceSettings(ws);
  if (!email || !canJoinWithoutInvite(settings, email)) {
    return { ok: false, error: "Your email cannot join this workspace without an invite. Ask an admin to invite you." };
  }

  const pending = await prisma.workspaceInvite.count({
    where: { workspaceId: ws.id, acceptedAt: null, expiresAt: { gt: now }, email: { not: email } },
  });
  const usage = seatUsage(ws, { members: ws.members.length, pendingInvites: pending }, now);
  if (usage.full) return { ok: false, error: "This workspace has no free seats. Ask an admin to make room." };

  try {
    const member = await prisma.workspaceMember.create({
      data: { workspaceId: ws.id, userId: user.id, role: settings.joinRole },
      select: { id: true },
    });
    // A live invite for the same address is used up by joining.
    await prisma.workspaceInvite.updateMany({
      where: { workspaceId: ws.id, email, acceptedAt: null },
      data: { acceptedAt: now },
    });
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      actorUserId: user.id,
      actorEmail: email,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_JOINED,
      targetType: "workspaceMember",
      targetId: member.id,
      meta: { email, role: settings.joinRole, via: "domain" },
    });
  } catch (err) {
    // Unique (workspaceId, userId): a double click already joined.
    const already = await prisma.workspaceMember.findFirst({ where: { workspaceId: ws.id, userId: user.id }, select: { id: true } });
    if (already) return { ok: true, slug: ws.slug };
    console.error("[join] failed:", err);
    return { ok: false, error: "Could not join. Try again." };
  }

  // Keep the Stripe seat count in step on a paid workspace (best effort).
  if (ws.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const count = await prisma.workspaceMember.count({ where: { workspaceId: ws.id } });
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(ws.stripeSubscriptionId);
      const itemId = seatItem(sub.items.data)?.id;
      if (itemId) await stripe.subscriptionItems.update(itemId, { quantity: count });
    } catch (err) {
      console.error("[join] Stripe seat update failed:", err);
    }
  }
  return { ok: true, slug: ws.slug };
}
