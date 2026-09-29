/**
 * Workspace invites on the server: the invite email, and sending a batch
 * of invites in one go. The members API route and the bulk invite action
 * both send through here.
 */
import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/interview/links";
import { ROLE_LABELS, seatUsage } from "./members";
import { classifyInvites, INVITE_TTL_MS, roleCounts, sendableInvites, type ClassifiedInvite, type InviteRowInput } from "./bulk-invite";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

/**
 * Emails one invite. Fire-and-forget: the invite row is the source of truth
 * and can be resent from the Invites tab.
 */
export function sendWorkspaceInviteEmail(params: {
  workspace: { id: string; name: string };
  inviteId: string;
  email: string;
  role: string;
  token: string;
  inviterName: string;
}) {
  void (async () => {
    try {
      const { sendEmail } = await import("@/lib/email");
      const origin = await appOrigin();
      await sendEmail({
        template: "workspace-invite",
        to: params.email,
        props: {
          workspaceName: params.workspace.name,
          inviterName: params.inviterName,
          roleLabel: ROLE_LABELS[params.role] ?? params.role,
          acceptUrl: `${origin}/invite/${params.token}`,
        },
        workspaceId: params.workspace.id,
        idempotencyKey: `ws-invite:${params.inviteId}:${params.token.slice(0, 8)}`,
      });
    } catch (err) {
      console.error("[ws-invite] email failed:", err);
    }
  })();
}

export type BulkInviteResult = {
  sent: { email: string; role: string }[];
  skipped: ClassifiedInvite[];
};

/**
 * Invites every row that passes the checks and reports the rest. The checks
 * run again here against fresh data, so what the dialog showed cannot be
 * used to go past the seat cap or the allowed domains.
 */
export async function sendBulkInvites(a: {
  workspace: { id: string; name: string; planName: string; trialEndsAt: Date | null; stripeSubscriptionId: string | null; allowedEmailDomains: string[] };
  actor: { userId: string; email: string | null; name: string };
  rows: InviteRowInput[];
  now?: Date;
}): Promise<BulkInviteResult> {
  const now = a.now ?? new Date();
  const [members, pending] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceId: a.workspace.id }, select: { user: { select: { email: true } } } }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId: a.workspace.id, acceptedAt: null, expiresAt: { gt: now } },
      select: { email: true },
    }),
  ]);
  const seats = seatUsage(a.workspace, { members: members.length, pendingInvites: pending.length }, now);
  const classified = classifyInvites(a.rows, {
    memberEmails: members.map((m) => m.user.email ?? "").filter(Boolean),
    pendingEmails: pending.map((p) => p.email),
    allowedDomains: a.workspace.allowedEmailDomains,
    seatsRemaining: seats.remaining,
  });
  const toSend = sendableInvites(classified);
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  const created = await prisma.$transaction(
    toSend.map((r) => {
      const token = crypto.randomBytes(24).toString("hex");
      return prisma.workspaceInvite.upsert({
        where: { workspaceId_email: { workspaceId: a.workspace.id, email: r.email } },
        update: { role: r.role, token, expiresAt, acceptedAt: null, invitedById: a.actor.userId },
        create: { workspaceId: a.workspace.id, email: r.email, role: r.role, token, expiresAt, invitedById: a.actor.userId },
        select: { id: true, email: true, role: true, token: true },
      });
    }),
  );
  for (const inv of created) {
    sendWorkspaceInviteEmail({ workspace: a.workspace, inviteId: inv.id, email: inv.email, role: inv.role, token: inv.token, inviterName: a.actor.name });
  }

  if (created.length === 1) {
    await writeWorkspaceAuditEntry({
      workspaceId: a.workspace.id,
      actorUserId: a.actor.userId,
      actorEmail: a.actor.email,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_INVITED,
      targetType: "workspaceInvite",
      targetId: created[0].id,
      meta: { email: created[0].email, role: created[0].role },
    });
  } else if (created.length > 1) {
    await writeWorkspaceAuditEntry({
      workspaceId: a.workspace.id,
      actorUserId: a.actor.userId,
      actorEmail: a.actor.email,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBERS_BULK_INVITED,
      targetType: "workspace",
      targetId: a.workspace.id,
      meta: { count: created.length, emails: created.slice(0, 5).map((c) => c.email), roles: roleCounts(created) },
    });
  }

  return {
    sent: created.map((c) => ({ email: c.email, role: c.role })),
    skipped: classified.filter((r) => r.issue !== null),
  };
}
