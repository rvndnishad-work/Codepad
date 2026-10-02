/**
 * Proposal tools. They never write: each checks the arguments against the
 * same rules the approval runs, reads what the card needs to show, and
 * returns a proposal. The admin approves, edits or dismisses the card; only
 * POST /api/admin/assistant/approve runs it (see ../execute.ts).
 */
import { prisma } from "@/lib/prisma";
import { getSwitch, switchDef } from "@/lib/admin/switches";
import { checkProposal, CREDIT_GRANT_MAX, TRIAL_EXTEND_MAX_DAYS, BLOG_ACTIONS } from "../guards";
import { AREA_KEYS, areaLabel } from "../maintenance-areas";
import { maskEmail } from "../mask";
import type { Proposal, ProposalKind, ToolDef, ToolResult, ObjectSchema } from "../types";

const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "not set";

function proposalResult(p: Omit<Proposal, "status">): ToolResult {
  return {
    summary: `Prepared: ${p.summary}`,
    proposal: { ...p, status: "pending" },
    data: {
      proposed: true,
      card: p.summary,
      note: "Shown to the admin as an approval card. Nothing has changed yet; it runs only if they approve.",
    },
  };
}

function refused(error: string): ToolResult {
  return { summary: `Could not prepare: ${error}`, data: { error } };
}

async function ownerOf(workspaceId: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, role: "OWNER" },
    orderBy: { id: "asc" },
    select: { user: { select: { name: true, email: true } } },
  });
}

function def(
  name: string,
  kind: ProposalKind,
  description: string,
  parameters: ObjectSchema,
  build: (args: Record<string, unknown>) => Promise<ToolResult>,
): ToolDef {
  return {
    kind: "propose",
    decl: { name, description, parameters },
    async run(args) {
      const checked = checkProposal(kind, args);
      if (!checked.ok) return refused(checked.error);
      return build(checked.args);
    },
  };
}

const propose_grant_credits = def(
  "propose_grant_credits",
  "grant_credits",
  `Prepare a grant of AI credits (1 to ${CREDIT_GRANT_MAX}) to a workspace, with a ledger note. Optionally email the owner. Shown as an approval card; nothing changes until the admin approves.`,
  {
    type: "object",
    properties: {
      workspaceId: { type: "string", maxLength: 60 },
      amount: { type: "integer", minimum: 1, maximum: CREDIT_GRANT_MAX },
      note: { type: "string", description: "Ledger note: why the credits are granted", maxLength: 500 },
      emailOwner: { type: "boolean", description: "Email the workspace owner about the grant" },
    },
    required: ["workspaceId", "amount", "note"],
  },
  async (a) => {
    const id = String(a.workspaceId);
    const [ws, bal, owner] = await Promise.all([
      prisma.workspace.findUnique({ where: { id }, select: { name: true, planName: true } }),
      prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: id }, _sum: { amount: true } }),
      ownerOf(id),
    ]);
    if (!ws) return refused("Workspace not found");
    const balance = bal._sum.amount ?? 0;
    const amount = a.amount as number;
    return proposalResult({
      kind: "grant_credits",
      args: { ...a, workspaceName: ws.name },
      summary: `Grant ${amount} AI credits to ${ws.name}`,
      facts: [
        { label: "Workspace", value: `${ws.name}, ${ws.planName}` },
        { label: "Balance now", value: `${balance} credits` },
        { label: "Balance after", value: `${balance + amount} credits` },
        ...(a.emailOwner ? [{ label: "Tell the workspace", value: owner ? `Email ${owner.user.name || maskEmail(owner.user.email)}, owner` : "No owner found" }] : []),
      ],
      fields: [
        { key: "amount", label: "Credits", input: "number" },
        { key: "note", label: "Ledger note", input: "textarea" },
        { key: "emailOwner", label: "Email the owner", input: "boolean" },
      ],
      approveLabel: "Approve and grant",
    });
  },
);

const propose_extend_trial = def(
  "propose_extend_trial",
  "extend_trial",
  `Prepare a trial extension of 1 to ${TRIAL_EXTEND_MAX_DAYS} days for a workspace. Shown as an approval card.`,
  {
    type: "object",
    properties: {
      workspaceId: { type: "string", maxLength: 60 },
      days: { type: "integer", minimum: 1, maximum: TRIAL_EXTEND_MAX_DAYS },
      note: { type: "string", maxLength: 500 },
    },
    required: ["workspaceId", "days", "note"],
  },
  async (a) => {
    const ws = await prisma.workspace.findUnique({ where: { id: String(a.workspaceId) }, select: { name: true, trialEndsAt: true } });
    if (!ws) return refused("Workspace not found");
    const base = ws.trialEndsAt && ws.trialEndsAt.getTime() > Date.now() ? ws.trialEndsAt : new Date();
    const after = new Date(base.getTime() + (a.days as number) * 86_400_000);
    return proposalResult({
      kind: "extend_trial",
      args: { ...a, workspaceName: ws.name },
      summary: `Extend the ${ws.name} trial by ${a.days} days`,
      facts: [
        { label: "Trial ends now", value: fmtDate(ws.trialEndsAt) },
        { label: "Trial ends after", value: fmtDate(after) },
      ],
      fields: [
        { key: "days", label: "Days", input: "number" },
        { key: "note", label: "Note", input: "textarea" },
      ],
      approveLabel: "Approve and extend",
    });
  },
);

const propose_set_switch = def(
  "propose_set_switch",
  "set_switch",
  "Prepare a feature switch change (on, read_only, off) with the message users see, an optional time to turn back on, and a note. Shown as an approval card.",
  {
    type: "object",
    properties: {
      key: { type: "string", description: "Switch key from get_switches", maxLength: 60 },
      state: { type: "string", enum: ["on", "read_only", "off"] },
      message: { type: "string", maxLength: 500 },
      resumeAt: { type: "string", format: "date-time", description: "ISO time to turn back on" },
      note: { type: "string", maxLength: 500 },
    },
    required: ["key", "state", "note"],
  },
  async (a) => {
    const key = String(a.key);
    const [cur, d] = [await getSwitch(key), switchDef(key)];
    return proposalResult({
      kind: "set_switch",
      args: a,
      summary: `Set ${d?.label ?? key} to ${String(a.state).replace("_", " ")}`,
      facts: [
        { label: "Now", value: cur.state.replace("_", " ") },
        { label: "Stops", value: d?.description ?? key },
        ...(a.resumeAt ? [{ label: "Back on at", value: fmtDate(new Date(String(a.resumeAt))) }] : []),
      ],
      fields: [
        { key: "state", label: "State", input: "select", options: ["on", "read_only", "off"] },
        { key: "message", label: "Message users see", input: "textarea" },
        { key: "resumeAt", label: "Turn back on at (ISO)", input: "datetime" },
        { key: "note", label: "Note", input: "textarea" },
      ],
      approveLabel: "Approve and change",
    });
  },
);

const propose_schedule_maintenance = def(
  "propose_schedule_maintenance",
  "schedule_maintenance",
  `Prepare a maintenance window for an area (${AREA_KEYS.join(", ")}): start time, length in minutes and the message people see. Shown as an approval card.`,
  {
    type: "object",
    properties: {
      area: { type: "string", enum: AREA_KEYS },
      startsAt: { type: "string", format: "date-time", description: "ISO start time" },
      minutes: { type: "integer", minimum: 5, maximum: 1440 },
      message: { type: "string", maxLength: 500 },
    },
    required: ["area", "startsAt", "minutes", "message"],
  },
  async (a) => {
    const start = new Date(String(a.startsAt));
    const end = new Date(start.getTime() + (a.minutes as number) * 60_000);
    const overlapping = await prisma.maintenanceRule.count({
      where: {
        endedAt: null,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lt: end } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: start } }] },
        ],
      },
    });
    return proposalResult({
      kind: "schedule_maintenance",
      args: a,
      summary: `Schedule maintenance: ${areaLabel(String(a.area))}, ${a.minutes} minutes`,
      facts: [
        { label: "Starts", value: fmtDate(start) },
        { label: "Ends", value: fmtDate(end) },
        { label: "Banner", value: "Shown 24 hours ahead on covered pages" },
        ...(overlapping ? [{ label: "Overlaps", value: `${overlapping} other rule${overlapping === 1 ? "" : "s"}` }] : []),
      ],
      fields: [
        { key: "area", label: "Area", input: "select", options: AREA_KEYS },
        { key: "startsAt", label: "Starts at (ISO)", input: "datetime" },
        { key: "minutes", label: "Minutes", input: "number" },
        { key: "message", label: "Message", input: "textarea" },
      ],
      approveLabel: "Approve and schedule",
    });
  },
);

const propose_email_workspace_owner = def(
  "propose_email_workspace_owner",
  "email_workspace_owner",
  "Prepare an email to the owner of a workspace with a subject and plain-text body. Shown as an approval card; it is sent only when approved.",
  {
    type: "object",
    properties: {
      workspaceId: { type: "string", maxLength: 60 },
      subject: { type: "string", maxLength: 150 },
      body: { type: "string", maxLength: 5000 },
    },
    required: ["workspaceId", "subject", "body"],
  },
  async (a) => {
    const id = String(a.workspaceId);
    const [ws, owner] = await Promise.all([
      prisma.workspace.findUnique({ where: { id }, select: { name: true } }),
      ownerOf(id),
    ]);
    if (!ws) return refused("Workspace not found");
    if (!owner?.user.email) return refused("This workspace has no owner with an email address");
    return proposalResult({
      kind: "email_workspace_owner",
      args: { ...a, workspaceName: ws.name },
      summary: `Email the owner of ${ws.name}`,
      facts: [{ label: "To", value: `${owner.user.name || "Owner"} (${maskEmail(owner.user.email)})` }],
      fields: [
        { key: "subject", label: "Subject", input: "text" },
        { key: "body", label: "Body", input: "textarea" },
      ],
      approveLabel: "Approve and send",
    });
  },
);

const propose_moderate_blog = def(
  "propose_moderate_blog",
  "moderate_blog",
  "Prepare a moderation decision on a blog post: approve (publish), needs_changes or reject. A reason is required unless approving; it is shown to the author.",
  {
    type: "object",
    properties: {
      postId: { type: "string", maxLength: 60 },
      action: { type: "string", enum: [...BLOG_ACTIONS] },
      reason: { type: "string", maxLength: 2000 },
    },
    required: ["postId", "action"],
  },
  async (a) => {
    const post = await prisma.blogPost.findUnique({
      where: { id: String(a.postId) },
      select: { title: true, status: true, user: { select: { name: true } } },
    });
    if (!post) return refused("Blog post not found");
    const verb = a.action === "approve" ? "Publish" : a.action === "reject" ? "Reject" : "Send back for changes";
    return proposalResult({
      kind: "moderate_blog",
      args: { ...a, title: post.title },
      summary: `${verb}: "${post.title}"`,
      facts: [
        { label: "Author", value: post.user?.name ?? "Unknown" },
        { label: "Status now", value: post.status.toLowerCase().replace("_", " ") },
      ],
      fields: [
        { key: "action", label: "Decision", input: "select", options: [...BLOG_ACTIONS] },
        { key: "reason", label: "Reason for the author", input: "textarea" },
      ],
      approveLabel: "Approve decision",
    });
  },
);

const propose_create_todo = def(
  "propose_create_todo",
  "create_todo",
  "Prepare a ticket on the admin backlog with a title and detail. Shown as an approval card.",
  {
    type: "object",
    properties: {
      title: { type: "string", maxLength: 200 },
      detail: { type: "string", maxLength: 4000 },
    },
    required: ["title"],
  },
  async (a) =>
    proposalResult({
      kind: "create_todo",
      args: a,
      summary: `Add a ticket: ${a.title}`,
      facts: [{ label: "Goes to", value: "Backlog, medium priority" }],
      fields: [
        { key: "title", label: "Title", input: "text" },
        { key: "detail", label: "Detail", input: "textarea" },
      ],
      approveLabel: "Approve and add",
    }),
);

export const PROPOSE_TOOLS: ToolDef[] = [
  propose_grant_credits,
  propose_extend_trial,
  propose_set_switch,
  propose_schedule_maintenance,
  propose_email_workspace_owner,
  propose_moderate_blog,
  propose_create_todo,
];
