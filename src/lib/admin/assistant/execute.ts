/**
 * Runs an approved assistant proposal with the same business rules as the
 * console, and records it in the platform audit log with via "assistant".
 *
 * approveProposal / dismissProposal are the only writers. A proposal is
 * claimed with a conditional update (status pending -> running) so a double
 * click or two tabs cannot run it twice. A failure puts it back to pending
 * with the error on the card, so the admin can edit and try again.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logAdminAction, type AdminActor } from "@/lib/admin/audit";
import { clearSwitchCache, getSwitch } from "@/lib/admin/switches";
import { sendEmail } from "@/lib/email";
import { checkProposal, BLOG_STATUS } from "./guards";
import { ASSISTANT_AREAS } from "./maintenance-areas";
import type { Proposal } from "./types";

export class ProposalError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

const DAY = 86_400_000;

async function workspaceOwnerEmail(workspaceId: string) {
  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: "OWNER" },
    orderBy: { id: "asc" },
    select: { user: { select: { name: true, email: true } } },
  });
  return owner?.user.email ? { name: owner.user.name, email: owner.user.email } : null;
}

async function emailOwner(workspaceId: string, workspaceName: string, subject: string, body: string): Promise<string> {
  const owner = await workspaceOwnerEmail(workspaceId);
  if (!owner) throw new ProposalError("This workspace has no owner with an email address");
  const res = await sendEmail({
    template: "data-privacy-notice",
    to: owner.email,
    workspaceId,
    props: {
      subject,
      badge: "Interviewpad",
      heading: subject,
      paragraphs: body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      cta: null,
      footer: `You are receiving this because you own the ${workspaceName} workspace on Interviewpad.`,
    },
  });
  if (!res.sent) throw new ProposalError(`The email was not sent: ${res.reason}`, 502);
  return owner.email;
}

type Run = { result: string };

/** Execute checked args. Exported for tests of the guard path only through approveProposal. */
async function run(p: Proposal, a: Record<string, unknown>, actor: AdminActor): Promise<Run> {
  const via = "assistant" as const;
  switch (p.kind) {
    case "grant_credits": {
      const workspaceId = String(a.workspaceId);
      const amount = a.amount as number;
      const note = String(a.note);
      const out = await prisma.$transaction(async (tx) => {
        const ws = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
        if (!ws) throw new ProposalError("Workspace not found", 404);
        const before = (await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } }))._sum.amount ?? 0;
        await tx.aIInterviewCreditLedger.create({
          data: { workspaceId, kind: "GRANT", amount, adminUserId: actor.id ?? null, note },
        });
        await logAdminAction(
          {
            actor, via, action: "workspace.credits.grant", targetType: "workspace", targetId: workspaceId, targetLabel: ws.name,
            before: { balance: before }, after: { balance: before + amount, granted: amount }, note,
          },
          tx,
        );
        return { name: ws.name, after: before + amount };
      });
      let mailed = "";
      if (a.emailOwner === true) {
        try {
          await emailOwner(
            workspaceId,
            out.name,
            `We added ${amount} AI credits to ${out.name}`,
            `We added ${amount} AI screening credits to your ${out.name} workspace. Your balance is now ${out.after} credits.\n\n${note}`,
          );
          mailed = ", owner emailed";
        } catch (err) {
          mailed = `, but the email failed: ${(err as Error).message}`;
        }
      }
      revalidatePath(`/admin/workspaces/${workspaceId}`, "layout");
      return { result: `Granted ${amount} credits to ${out.name}; balance is now ${out.after}${mailed}.` };
    }

    case "extend_trial": {
      const workspaceId = String(a.workspaceId);
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, trialEndsAt: true } });
      if (!ws) throw new ProposalError("Workspace not found", 404);
      const base = ws.trialEndsAt && ws.trialEndsAt.getTime() > Date.now() ? ws.trialEndsAt : new Date();
      const trialEndsAt = new Date(base.getTime() + (a.days as number) * DAY);
      await prisma.workspace.update({ where: { id: workspaceId }, data: { trialEndsAt, trialEndedAt: null } });
      await logAdminAction({
        actor, via, action: "workspace.trial.extend", targetType: "workspace", targetId: workspaceId, targetLabel: ws.name,
        before: { trialEndsAt: ws.trialEndsAt }, after: { trialEndsAt }, note: String(a.note),
      });
      revalidatePath(`/admin/workspaces/${workspaceId}`, "layout");
      return { result: `Extended the ${ws.name} trial to ${trialEndsAt.toISOString().slice(0, 10)}.` };
    }

    case "set_switch": {
      const key = String(a.key);
      const before = await getSwitch(key);
      const data = {
        state: String(a.state),
        message: String(a.message ?? "") || null,
        resumeAt: a.resumeAt ? new Date(String(a.resumeAt)) : null,
        updatedById: actor.id ?? null,
        updatedNote: String(a.note),
      };
      await prisma.featureSwitch.upsert({ where: { key }, create: { key, ...data }, update: data });
      clearSwitchCache();
      await logAdminAction({
        actor, via, action: "switch.set", targetType: "switch", targetId: key, targetLabel: key,
        before: { state: before.state, message: before.message, resumeAt: before.resumeAt },
        after: { state: data.state, message: data.message, resumeAt: data.resumeAt },
        note: data.updatedNote,
      });
      revalidatePath("/admin/switches");
      return { result: `Switch ${key} is now ${data.state.replace("_", " ")}.` };
    }

    case "schedule_maintenance": {
      const area = ASSISTANT_AREAS.find((x) => x.key === a.area);
      if (!area) throw new ProposalError("Unknown area");
      const startsAt = new Date(String(a.startsAt));
      const endsAt = new Date(startsAt.getTime() + (a.minutes as number) * 60_000);
      const rule = await prisma.maintenanceRule.create({
        data: { area: area.key, paths: area.paths, message: String(a.message), startsAt, endsAt, bannerHours: 24, createdById: actor.id ?? null },
      });
      await logAdminAction({
        actor, via, action: "maintenance.create", targetType: "maintenance", targetId: rule.id, targetLabel: area.label,
        after: { area: area.key, startsAt, endsAt, message: rule.message },
      });
      revalidatePath("/admin/maintenance");
      return { result: `Scheduled maintenance for ${area.label} from ${startsAt.toISOString()} to ${endsAt.toISOString()}.` };
    }

    case "email_workspace_owner": {
      const workspaceId = String(a.workspaceId);
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
      if (!ws) throw new ProposalError("Workspace not found", 404);
      const to = await emailOwner(workspaceId, ws.name, String(a.subject), String(a.body));
      await logAdminAction({
        actor, via, action: "workspace.email", targetType: "workspace", targetId: workspaceId, targetLabel: ws.name,
        after: { to, subject: a.subject }, note: String(a.body).slice(0, 500),
      });
      return { result: `Emailed the owner of ${ws.name}.` };
    }

    case "moderate_blog": {
      const postId = String(a.postId);
      const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { title: true, status: true, publishedAt: true } });
      if (!post) throw new ProposalError("Blog post not found", 404);
      const status = BLOG_STATUS[a.action as keyof typeof BLOG_STATUS];
      const reason = String(a.reason ?? "") || null;
      await prisma.$transaction(async (tx) => {
        await tx.blogPost.update({
          where: { id: postId },
          data: {
            status,
            published: status === "PUBLISHED",
            adminNotes: reason,
            ...(status === "PUBLISHED" && !post.publishedAt ? { publishedAt: new Date() } : {}),
          },
        });
        await tx.gemmaAlert.updateMany({
          where: { targetId: postId, status: "UNRESOLVED", type: "MODERATION" },
          data: { status: "RESOLVED", resolvedAt: new Date() },
        });
        await logAdminAction(
          {
            actor, via, action: "content.blog", targetType: "blog", targetId: postId, targetLabel: post.title,
            before: { status: post.status }, after: { status }, note: reason,
          },
          tx,
        );
      });
      revalidatePath("/admin/blogs");
      return { result: `"${post.title}" is now ${status.toLowerCase().replace("_", " ")}.` };
    }

    case "create_todo": {
      const todo = await prisma.$transaction(async (tx) => {
        const last = await tx.adminTodo.findFirst({
          where: { ticketSeq: { not: null } },
          orderBy: { ticketSeq: "desc" },
          select: { ticketSeq: true },
        });
        const seq = (last?.ticketSeq ?? 0) + 1;
        const created = await tx.adminTodo.create({
          data: {
            title: String(a.title),
            body: String(a.detail ?? "") || null,
            category: "Assistant",
            addedByEmail: actor.email ?? null,
            ticketSeq: seq,
            ticketKey: `IP-${seq}`,
          },
          select: { id: true, ticketKey: true },
        });
        await logAdminAction(
          { actor, via, action: "todo.create", targetType: "todo", targetId: created.id, targetLabel: created.ticketKey, after: { title: a.title } },
          tx,
        );
        return created;
      });
      revalidatePath("/admin/todos");
      return { result: `Added ${todo.ticketKey} to the backlog.` };
    }
  }
}

/** Merge the admin's edits onto the stored args: only editable fields. */
export function applyEdits(p: Proposal, edits: unknown): Record<string, unknown> {
  const args = { ...p.args };
  if (!edits || typeof edits !== "object") return args;
  const editable = new Set(p.fields.filter((f) => !f.readOnly).map((f) => f.key));
  for (const [k, v] of Object.entries(edits as Record<string, unknown>)) {
    if (editable.has(k)) args[k] = v;
  }
  return args;
}

async function loadProposal(messageId: string, userId: string) {
  const msg = await prisma.assistantMessage.findFirst({
    where: { id: messageId, conversation: { userId } },
    select: { id: true, proposal: true },
  });
  if (!msg?.proposal) throw new ProposalError("No proposal on this message", 404);
  return msg.proposal as unknown as Proposal;
}

async function claim(messageId: string, p: Proposal, next: Partial<Proposal>): Promise<boolean> {
  const res = await prisma.assistantMessage.updateMany({
    where: { id: messageId, proposal: { path: ["status"], equals: "pending" } },
    data: { proposal: { ...p, ...next } as unknown as Prisma.InputJsonValue },
  });
  return res.count === 1;
}

async function save(messageId: string, p: Proposal) {
  await prisma.assistantMessage.update({ where: { id: messageId }, data: { proposal: p as unknown as Prisma.InputJsonValue } });
}

export async function approveProposal(opts: {
  messageId: string;
  userId: string;
  actor: AdminActor;
  edits?: unknown;
}): Promise<Proposal> {
  const p = await loadProposal(opts.messageId, opts.userId);
  if (p.status !== "pending") throw new ProposalError(`This card is already ${p.status}`, 409);
  const checked = checkProposal(p.kind, applyEdits(p, opts.edits));
  if (!checked.ok) throw new ProposalError(checked.error);
  const args = { ...p.args, ...checked.args };
  if (!(await claim(opts.messageId, p, { status: "running", args }))) {
    throw new ProposalError("This card is already being handled", 409);
  }
  try {
    const { result } = await run(p, args, opts.actor);
    const done: Proposal = {
      ...p, args, status: "approved", result, error: undefined, decidedAt: new Date().toISOString(), decidedBy: opts.actor.email ?? null,
    };
    await save(opts.messageId, done);
    return done;
  } catch (err) {
    const message = err instanceof ProposalError ? err.message : "The action failed on the server.";
    if (!(err instanceof ProposalError)) console.error("[assistant] proposal failed", p.kind, err);
    await save(opts.messageId, { ...p, args, status: "pending", error: message });
    throw err instanceof ProposalError ? err : new ProposalError(message, 500);
  }
}

export async function dismissProposal(opts: { messageId: string; userId: string; actor: AdminActor }): Promise<Proposal> {
  const p = await loadProposal(opts.messageId, opts.userId);
  if (p.status !== "pending") throw new ProposalError(`This card is already ${p.status}`, 409);
  const next: Proposal = { ...p, status: "dismissed", decidedAt: new Date().toISOString(), decidedBy: opts.actor.email ?? null };
  if (!(await claim(opts.messageId, p, next))) throw new ProposalError("This card is already being handled", 409);
  await logAdminAction({
    actor: opts.actor, via: "assistant", action: "assistant.proposal.dismiss", targetType: "assistant", targetId: opts.messageId,
    targetLabel: p.summary, after: { kind: p.kind, args: p.args },
  });
  return next;
}
