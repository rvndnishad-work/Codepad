"use server";

/**
 * Members page actions that need more than one row changed: removing a
 * member with a handover, making someone an owner or handing ownership
 * over, and inviting several people at once. Single role and permission
 * changes and single invites still go through /api/w/[slug]/members.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { checkRemoval } from "@/lib/workspace/members";
import { checkHandover, handoverTargets, type HandoverCounts } from "@/lib/workspace/handover";
import { loadHandoverPreview, removeMemberWithHandover, type HandoverOutcome } from "@/lib/workspace/handover-server";
import { checkOwnerChange, ownerChangeAudit, ownersAfter } from "@/lib/workspace/ownership";
import { isInvitableRole, isValidEmail, MAX_BULK_INVITES, type ClassifiedInvite } from "@/lib/workspace/bulk-invite";
import { sendBulkInvites } from "@/lib/workspace/invites-server";

type Fail = { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

class ActionError extends Error {}

const fail = (err: unknown): Fail => {
  if (!(err instanceof ActionError)) console.error("[members] action failed:", err);
  return { ok: false, error: err instanceof ActionError ? err.message : "Something went wrong. Try again." };
};

async function loadContext(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new ActionError("You are signed out. Sign in and try again.");
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      allowedEmailDomains: true,
      members: { select: { id: true, userId: true, role: true, permissions: true, user: { select: { name: true, email: true } } } },
    },
  });
  if (!workspace) throw new ActionError("Workspace not found.");
  const caller = workspace.members.find((m) => m.userId === session.user.id);
  if (!caller) throw new ActionError("You are not a member of this workspace.");
  return {
    workspace,
    caller,
    actor: { userId: session.user.id, email: session.user.email ?? null, name: session.user.name || session.user.email?.split("@")[0] || "A teammate" },
  };
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

const nameOf = (m: { user: { name: string | null; email: string | null } }) => m.user.name || m.user.email || "A member";

async function assertCanRemove(ctx: Ctx, memberId: string) {
  if (!(await canMember(ctx.caller, "member:remove"))) throw new ActionError("You do not have permission to remove people.");
  const target = ctx.workspace.members.find((m) => m.id === memberId);
  if (!target) throw new ActionError("That person is no longer in this workspace.");
  if (target.id === ctx.caller.id) throw new ActionError("You cannot remove yourself here.");
  const guard = checkRemoval({ caller: ctx.caller, target, members: ctx.workspace.members });
  if (!guard.ok) throw new ActionError(guard.error);
  return target;
}

/* ── Remove with handover ────────────────────────────────────────────────── */

export type HandoverPreviewResult =
  | {
      ok: true;
      counts: HandoverCounts;
      hosted: { id: string; title: string; candidateName: string | null; scheduledAt: string | null }[];
      /** People who can take the work, by user id. */
      people: { userId: string; name: string; role: string; isMe: boolean }[];
    }
  | Fail;

/** What the member has that needs a new home, for the remove dialog. */
export async function loadHandoverAction(slug: string, memberId: string): Promise<HandoverPreviewResult> {
  try {
    const ctx = await loadContext(slug);
    const target = await assertCanRemove(ctx, String(memberId));
    const preview = await loadHandoverPreview(ctx.workspace.id, target.userId);
    const people = handoverTargets(ctx.workspace.members, target.id).map((m) => ({
      userId: m.userId,
      name: nameOf(m),
      role: m.role,
      isMe: m.id === ctx.caller.id,
    }));
    return { ok: true, ...preview, people };
  } catch (err) {
    return fail(err);
  }
}

const choicesSchema = z.object({
  ownerUserId: z.string().max(40).nullable(),
  interviewMode: z.enum(["reassign", "cancel"]),
  interviewerUserId: z.string().max(40).nullable(),
  reviewerUserId: z.string().max(40).nullable(),
});

export type RemoveMemberResult = ({ ok: true } & HandoverOutcome) | Fail;

/** Hands over the member's work as chosen, then removes them. */
export async function removeMemberAction(slug: string, memberId: string, raw: z.input<typeof choicesSchema>): Promise<RemoveMemberResult> {
  try {
    const ctx = await loadContext(slug);
    const target = await assertCanRemove(ctx, String(memberId));
    const parsed = choicesSchema.safeParse(raw);
    if (!parsed.success) throw new ActionError("Check the handover choices and try again.");
    const choices = parsed.data;

    const eligible = handoverTargets(ctx.workspace.members, target.id).map((m) => m.userId);
    const preview = await loadHandoverPreview(ctx.workspace.id, target.userId);
    const check = checkHandover(preview.counts, choices, eligible);
    if (!check.ok) return { ok: false, error: "Choose who takes over their work.", fieldErrors: check.errors };

    const names = Object.fromEntries(ctx.workspace.members.map((m) => [m.userId, nameOf(m)]));
    const outcome = await removeMemberWithHandover({
      workspace: { id: ctx.workspace.id, memberCount: ctx.workspace.members.length, stripeSubscriptionId: ctx.workspace.stripeSubscriptionId },
      target: { memberId: target.id, userId: target.userId, email: target.user.email, name: target.user.name, role: target.role },
      choices,
      actor: { userId: ctx.actor.userId, email: ctx.actor.email },
      names,
    });
    revalidatePath(`/w/${slug}`, "layout");
    return { ok: true, ...outcome };
  } catch (err) {
    return fail(err);
  }
}

/* ── Owners ──────────────────────────────────────────────────────────────── */

export type OwnerChangeResult = { ok: true; onlyOwner: boolean } | Fail;

/**
 * "add" makes the member an owner next to the current owners. "transfer"
 * also steps the caller down to admin.
 */
export async function changeOwnerAction(slug: string, memberId: string, mode: "add" | "transfer"): Promise<OwnerChangeResult> {
  try {
    if (mode !== "add" && mode !== "transfer") throw new ActionError("Unknown change.");
    const ctx = await loadContext(slug);
    if (!(await canMember(ctx.caller, "member:set_role"))) throw new ActionError("You do not have permission to change roles.");
    const target = ctx.workspace.members.find((m) => m.id === String(memberId));
    if (!target) throw new ActionError("That person is no longer in this workspace.");
    const guard = checkOwnerChange({ caller: ctx.caller, target, mode });
    if (!guard.ok) throw new ActionError(guard.error);

    await prisma.$transaction([
      prisma.workspaceMember.update({ where: { id: target.id }, data: { role: "OWNER" } }),
      ...(mode === "transfer" ? [prisma.workspaceMember.update({ where: { id: ctx.caller.id }, data: { role: "ADMIN" } })] : []),
    ]);

    const owners = ownersAfter(ctx.workspace.members, target.id, ctx.caller.id, mode);
    const actor = { actorUserId: ctx.actor.userId, actorEmail: ctx.actor.email };
    await writeWorkspaceAuditEntry({
      workspaceId: ctx.workspace.id,
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
      targetType: "workspaceMember",
      targetId: target.id,
      meta: { userId: target.userId, email: target.user.email, from: target.role, to: "OWNER" },
    });
    if (mode === "transfer") {
      await writeWorkspaceAuditEntry({
        workspaceId: ctx.workspace.id,
        ...actor,
        action: WORKSPACE_AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
        targetType: "workspaceMember",
        targetId: ctx.caller.id,
        meta: { userId: ctx.caller.userId, email: ctx.caller.user.email, from: "OWNER", to: "ADMIN" },
      });
    }
    await writeWorkspaceAuditEntry({
      workspaceId: ctx.workspace.id,
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS[ownerChangeAudit(owners.length, mode)],
      targetType: "workspaceMember",
      targetId: target.id,
      meta: { name: target.user.name, email: target.user.email, fromName: mode === "transfer" ? nameOf(ctx.caller) : undefined },
    });
    revalidatePath(`/w/${slug}`, "layout");
    return { ok: true, onlyOwner: owners.length === 1 };
  } catch (err) {
    return fail(err);
  }
}

/* ── Bulk invite ─────────────────────────────────────────────────────────── */

const bulkSchema = z
  .array(z.object({ email: z.string().trim().toLowerCase().max(254), role: z.string().max(20) }))
  .min(1)
  .max(MAX_BULK_INVITES);

export type BulkInviteActionResult = { ok: true; sent: { email: string; role: string }[]; skipped: ClassifiedInvite[] } | Fail;

export async function bulkInviteAction(slug: string, rows: { email: string; role: string }[]): Promise<BulkInviteActionResult> {
  try {
    const parsed = bulkSchema.safeParse(rows);
    if (!parsed.success) throw new ActionError(`Add between 1 and ${MAX_BULK_INVITES} people.`);
    if (parsed.data.some((r) => !isInvitableRole(r.role))) throw new ActionError("Pick a role for everyone. Owners are made from People after they join.");
    if (parsed.data.some((r) => !isValidEmail(r.email))) throw new ActionError("Fix or remove the emails that are not valid.");
    const ctx = await loadContext(slug);
    if (!(await canMember(ctx.caller, "member:invite"))) throw new ActionError("You do not have permission to invite people.");
    const res = await sendBulkInvites({
      workspace: ctx.workspace,
      actor: ctx.actor,
      rows: parsed.data,
    });
    revalidatePath(`/w/${slug}/members`);
    return { ok: true, ...res };
  } catch (err) {
    return fail(err);
  }
}
