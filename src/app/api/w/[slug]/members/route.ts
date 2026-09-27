import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { canMember, isPermission } from "@/lib/permissions";
import { appOrigin } from "@/lib/interview/links";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import {
  INVITABLE_ROLES,
  ROLE_LABELS,
  WORKSPACE_ROLES,
  checkRemoval,
  checkRoleChange,
  seatUsage,
} from "@/lib/workspace/members";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(INVITABLE_ROLES),
});

const resendSchema = z.object({ resendInviteId: z.string().min(1) });

const patchSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(WORKSPACE_ROLES).optional(),
  /** Per-member permission delta. `null` clears overrides; an object sets them.
   *  Keys are validated against the concrete Permission union below. */
  permissions: z.record(z.string(), z.boolean()).nullable().optional(),
});

type Params = { params: Promise<{ slug: string }> };

/** Signed-in caller, the workspace with its members, and the caller's membership. */
async function loadContext(slug: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;
  }
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: { members: { include: { user: { select: { email: true, name: true } } } } },
  });
  if (!workspace) {
    return { error: NextResponse.json({ error: "Workspace not found" }, { status: 404 }) } as const;
  }
  const caller = workspace.members.find((m) => m.userId === session.user.id);
  if (!caller) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session, workspace, caller } as const;
}

function sendInviteEmail(params: {
  workspace: { id: string; name: string };
  inviteId: string;
  email: string;
  role: string;
  token: string;
  inviterName: string;
}) {
  // Fire-and-forget: the invite row is the source of truth and can be resent.
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

// POST — invite a teammate ({ email, role }) or resend a pending invite
// ({ resendInviteId }). Resending issues a fresh link and a new 14-day expiry.
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const ctx = await loadContext(slug);
  if ("error" in ctx) return ctx.error;
  const { session, workspace, caller } = ctx;

  if (!(await canMember(caller, "member:invite"))) {
    return NextResponse.json({ error: "You do not have permission to invite people." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const inviterName = session.user.name || session.user.email?.split("@")[0] || "A teammate";
  const now = new Date();

  const resend = resendSchema.safeParse(body);
  if (resend.success) {
    const existing = await prisma.workspaceInvite.findFirst({
      where: { id: resend.data.resendInviteId, workspaceId: workspace.id, acceptedAt: null },
    });
    if (!existing) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    // An expired invite no longer holds a seat, so resending it takes one.
    if (existing.expiresAt <= now) {
      const pending = await prisma.workspaceInvite.count({
        where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: now } },
      });
      const usage = seatUsage(workspace, { members: workspace.members.length, pendingInvites: pending }, now);
      if (usage.full) {
        return NextResponse.json(
          { error: `All ${usage.limit} seats are used. Remove someone or revoke an invite first.` },
          { status: 403 },
        );
      }
    }

    const token = crypto.randomBytes(24).toString("hex");
    const invite = await prisma.workspaceInvite.update({
      where: { id: existing.id },
      data: { token, expiresAt: new Date(now.getTime() + INVITE_TTL_MS), invitedById: session.user.id },
    });
    sendInviteEmail({ workspace, inviteId: invite.id, email: invite.email, role: invite.role, token, inviterName });
    await writeWorkspaceAuditEntry({
      workspaceId: workspace.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_INVITE_RESENT,
      targetType: "workspaceInvite",
      targetId: invite.id,
      meta: { email: invite.email, role: invite.role },
    });
    return NextResponse.json({
      ok: true,
      invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt.toISOString() },
    });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and pick a role." }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const targetEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true } });
  if (existingUser && workspace.members.some((m) => m.userId === existingUser.id)) {
    return NextResponse.json({ error: "That person is already a member of this workspace." }, { status: 400 });
  }

  // Members plus outstanding invites count toward the seat cap. Re-inviting an
  // address that already has a live invite reuses that seat.
  const pendingOthers = await prisma.workspaceInvite.count({
    where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: now }, email: { not: targetEmail } },
  });
  const usage = seatUsage(workspace, { members: workspace.members.length, pendingInvites: pendingOthers }, now);
  if (usage.full) {
    return NextResponse.json(
      { error: `All ${usage.limit} seats are used. Remove someone or revoke an invite, or change plan in Billing.` },
      { status: 403 },
    );
  }

  try {
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const invite = await prisma.workspaceInvite.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: targetEmail } },
      update: { role, token, expiresAt, acceptedAt: null, invitedById: session.user.id },
      create: { workspaceId: workspace.id, email: targetEmail, role, token, expiresAt, invitedById: session.user.id },
    });
    sendInviteEmail({ workspace, inviteId: invite.id, email: targetEmail, role, token, inviterName });
    await writeWorkspaceAuditEntry({
      workspaceId: workspace.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_INVITED,
      targetType: "workspaceInvite",
      targetId: invite.id,
      meta: { email: targetEmail, role },
    });
    return NextResponse.json({
      ok: true,
      invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt.toISOString() },
    });
  } catch (err) {
    console.error("Failed to create invite:", err);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}

// DELETE — revoke a pending invite ({ inviteId }) or remove a teammate
// ({ memberId }). Removing someone scales the Stripe seat count down.
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await loadContext(slug);
    if ("error" in ctx) return ctx.error;
    const { session, workspace, caller } = ctx;

    const body = await req.json().catch(() => null);
    const memberId = typeof body?.memberId === "string" ? body.memberId : null;
    const inviteId = typeof body?.inviteId === "string" ? body.inviteId : null;
    if (!memberId && !inviteId) {
      return NextResponse.json({ error: "Missing memberId or inviteId" }, { status: 400 });
    }

    if (inviteId) {
      // Revoking an invite is the undo of inviting, so it needs member:invite.
      if (!(await canMember(caller, "member:invite")) && !(await canMember(caller, "member:remove"))) {
        return NextResponse.json({ error: "You do not have permission to revoke invites." }, { status: 403 });
      }
      // Scoped to this workspace so a guessed id from another tenant cannot be revoked.
      const invite = await prisma.workspaceInvite.findFirst({ where: { id: inviteId, workspaceId: workspace.id } });
      if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
      await prisma.workspaceInvite.delete({ where: { id: invite.id } });
      await writeWorkspaceAuditEntry({
        workspaceId: workspace.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email ?? null,
        action: WORKSPACE_AUDIT_ACTIONS.MEMBER_INVITE_REVOKED,
        targetType: "workspaceInvite",
        targetId: invite.id,
        meta: { email: invite.email, role: invite.role },
      });
      return NextResponse.json({ ok: true });
    }

    if (!(await canMember(caller, "member:remove"))) {
      return NextResponse.json({ error: "You do not have permission to remove people." }, { status: 403 });
    }

    const target = workspace.members.find((m) => m.id === memberId);
    if (!target) return NextResponse.json({ error: "Teammate not found" }, { status: 404 });

    const guard = checkRemoval({ caller, target, members: workspace.members });
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    await prisma.workspaceMember.delete({ where: { id: target.id } });
    await writeWorkspaceAuditEntry({
      workspaceId: workspace.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_REMOVED,
      targetType: "workspaceMember",
      targetId: target.id,
      meta: { userId: target.userId, email: target.user.email, role: target.role },
    });

    // Scale down the Stripe seat count on per-seat subscriptions.
    if (workspace.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
        const subItemId = subscription.items.data[0]?.id;
        if (subItemId) {
          await stripe.subscriptionItems.update(subItemId, {
            quantity: Math.max(1, workspace.members.length - 1),
          });
        }
      } catch (stripeErr) {
        console.error("Failed to update Stripe seats count during member removal:", stripeErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to remove member:", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}

// PATCH — change a teammate's role and/or per-member permission overrides.
// Gated by member:set_role; ownership rules live in checkRoleChange.
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await loadContext(slug);
    if ("error" in ctx) return ctx.error;
    const { session, workspace, caller } = ctx;

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { memberId, role, permissions } = parsed.data;
    if (role === undefined && permissions === undefined) {
      return NextResponse.json({ error: "Nothing to update. Send a role and/or permissions." }, { status: 400 });
    }

    // Reject override keys the code cannot enforce (concrete permissions only;
    // wildcards belong to role definitions, not per-member deltas).
    if (permissions) {
      const unknown = Object.keys(permissions).filter((k) => !isPermission(k));
      if (unknown.length) {
        return NextResponse.json({ error: `Unknown permission(s): ${unknown.join(", ")}` }, { status: 400 });
      }
    }

    if (!(await canMember(caller, "member:set_role"))) {
      return NextResponse.json({ error: "You do not have permission to change roles." }, { status: 403 });
    }

    const target = workspace.members.find((m) => m.id === memberId);
    if (!target) return NextResponse.json({ error: "Teammate not found" }, { status: 404 });

    if (role !== undefined) {
      const guard = checkRoleChange({ caller, target, nextRole: role, members: workspace.members });
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const member = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(permissions !== undefined ? { permissions: permissions === null ? Prisma.DbNull : permissions } : {}),
      },
      include: { user: { select: { name: true, image: true, email: true } } },
    });

    const actor = { actorUserId: session.user.id, actorEmail: session.user.email ?? null };
    if (role !== undefined && role !== target.role) {
      await writeWorkspaceAuditEntry({
        workspaceId: workspace.id,
        ...actor,
        action: WORKSPACE_AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
        targetType: "workspaceMember",
        targetId: target.id,
        meta: { userId: target.userId, email: target.user.email, from: target.role, to: role },
      });
    }
    if (permissions !== undefined) {
      await writeWorkspaceAuditEntry({
        workspaceId: workspace.id,
        ...actor,
        action: WORKSPACE_AUDIT_ACTIONS.MEMBER_PERMISSIONS_CHANGED,
        targetType: "workspaceMember",
        targetId: target.id,
        meta: { userId: target.userId, email: target.user.email, overrides: permissions },
      });
    }

    return NextResponse.json({ ok: true, member });
  } catch (err) {
    console.error("Failed to update member:", err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}
