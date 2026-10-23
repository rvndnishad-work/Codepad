/**
 * Demo requests on the server: storing a request from the public form,
 * the admin console's changes (stage, owner, demo time, notes) and making,
 * extending and ending the pilot workspace that comes out of a demo.
 *
 * A pilot is a Growth workspace on the prepaid columns with
 * prepaidCadence = "pilot" (see src/lib/billing/pilot.ts), so every plan gate
 * already treats it as Growth until its end date and as Free after.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { poolWhere } from "@/lib/billing/credit-pool";
import { appOrigin } from "@/lib/interview/links";
import { logAdminAction } from "@/lib/admin/audit";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { PILOT_DEFAULTS } from "@/lib/billing/catalog";
import {
  PILOT_CADENCE,
  PILOT_CREDIT_KIND,
  PILOT_EXPIRED_KIND,
  isPilot,
  pilotCreditsToExpire,
  pilotEnd,
  pilotInputErrors,
} from "@/lib/billing/pilot";
import {
  HIRING_TYPES,
  MONTHLY_VOLUMES,
  STAGE_LABELS,
  TEAM_SIZES,
  isDemoStage,
  isEnterpriseLead,
  optionLabel,
  slugFromCompany,
  suggestedPlan,
  type DemoRequestInput,
} from "./model";

export type Actor = { id: string | null; email: string | null };
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DAY_MS = 86_400_000;
/** A second request from the same email this soon joins the first one. */
const DUPLICATE_WINDOW_MS = DAY_MS;

const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Where new-request emails go: DEMO_REQUEST_EMAILS, else ADMIN_EMAILS. */
function salesInbox(): string[] {
  const raw = process.env.DEMO_REQUEST_EMAILS || process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function addEvent(requestId: string, actor: Actor | null, kind: string, text: string) {
  await prisma.demoRequestEvent.create({
    data: { requestId, actorUserId: actor?.id ?? null, actorEmail: actor?.email ?? null, kind, text },
  });
}

// ── Public form ───────────────────────────────────────────────────────────

/**
 * Store a request and send the two emails. A repeat from the same address
 * within a day, while the first is still open, is added to the first one's
 * history instead of making a second request.
 */
export async function createDemoRequest(input: DemoRequestInput, now: Date = new Date()): Promise<{ id: string; duplicate: boolean }> {
  const recent = await prisma.demoRequest.findFirst({
    where: { email: input.email, createdAt: { gt: new Date(now.getTime() - DUPLICATE_WINDOW_MS) }, stage: { in: ["NEW", "CONTACTED", "DEMO_BOOKED"] } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    await addEvent(recent.id, null, "received", `Sent the form again${input.message ? `: "${input.message.slice(0, 300)}"` : ""}`);
    return { id: recent.id, duplicate: true };
  }

  const enterpriseLead = isEnterpriseLead(input);
  const row = await prisma.demoRequest.create({
    data: {
      name: input.name,
      email: input.email,
      company: input.company,
      jobTitle: input.jobTitle ?? null,
      teamSize: input.teamSize,
      monthlyVolume: input.monthlyVolume,
      hiringType: input.hiringType,
      message: input.message ?? null,
      source: input.source,
      enterpriseLead,
      events: { create: { kind: "received", text: `Request received from ${input.source === "direct" ? "the demo page" : `/${input.source}`}` } },
    },
    select: { id: true },
  });

  // Emails never fail the request: the row is what matters.
  try {
    const { sendEmail } = await import("@/lib/email");
    const origin = await appOrigin();
    await sendEmail({
      template: "demo-request-received",
      to: input.email,
      props: { name: input.name.split(/\s+/)[0] || input.name, company: input.company },
      idempotencyKey: `demo-received:${row.id}`,
    });
    const team = salesInbox();
    if (team.length) {
      await sendEmail({
        template: "demo-request-admin",
        to: team,
        replyTo: input.email,
        props: {
          name: input.name,
          email: input.email,
          company: input.company,
          jobTitle: input.jobTitle ?? null,
          teamSize: optionLabel(TEAM_SIZES, input.teamSize),
          monthlyVolume: optionLabel(MONTHLY_VOLUMES, input.monthlyVolume),
          hiringType: optionLabel(HIRING_TYPES, input.hiringType),
          message: input.message ?? null,
          suggestedPlan: suggestedPlan(input),
          enterpriseLead,
          adminUrl: `${origin}/admin/demo-requests/${row.id}`,
        },
        idempotencyKey: `demo-admin:${row.id}`,
      });
    }
  } catch (err) {
    console.error("[demo-request] email failed:", err);
  }
  return { id: row.id, duplicate: false };
}

// ── Admin changes ─────────────────────────────────────────────────────────

async function loadRequest(id: string) {
  return prisma.demoRequest.findUnique({ where: { id } });
}

function audit(actor: Actor, action: string, req: { id: string; company: string }, before: unknown, after: unknown, note?: string) {
  return logAdminAction({
    actor,
    action,
    targetType: "demoRequest",
    targetId: req.id,
    targetLabel: req.company,
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
    note,
  });
}

export async function setDemoStage(actor: Actor, id: string, stage: unknown): Promise<Result> {
  if (!isDemoStage(stage)) return { ok: false, error: "Pick a stage from the list." };
  const req = await loadRequest(id);
  if (!req) return { ok: false, error: "Request not found." };
  if (req.stage === stage) return { ok: true };
  await prisma.demoRequest.update({ where: { id }, data: { stage } });
  await addEvent(id, actor, "stage", `Moved from ${STAGE_LABELS[req.stage as keyof typeof STAGE_LABELS] ?? req.stage} to ${STAGE_LABELS[stage]}`);
  await audit(actor, "demo_request.stage", req, { stage: req.stage }, { stage });
  return { ok: true };
}

/** Take the request (owner = the admin), or let it go (`take` false). */
export async function setDemoOwner(actor: Actor, id: string, take: boolean): Promise<Result> {
  const req = await loadRequest(id);
  if (!req) return { ok: false, error: "Request not found." };
  const data = take ? { ownerUserId: actor.id, ownerEmail: actor.email } : { ownerUserId: null, ownerEmail: null };
  await prisma.demoRequest.update({ where: { id }, data });
  // Taking a new request means someone is on it.
  if (take && req.stage === "NEW") await prisma.demoRequest.update({ where: { id }, data: { stage: "CONTACTED" } });
  await addEvent(id, actor, "owner", take ? `${actor.email ?? "An admin"} took the request` : `${actor.email ?? "An admin"} let the request go`);
  await audit(actor, "demo_request.owner", req, { owner: req.ownerEmail }, { owner: data.ownerEmail });
  return { ok: true };
}

/** Book (or clear, with null) the demo call. */
export async function setDemoTime(actor: Actor, id: string, when: unknown): Promise<Result> {
  const req = await loadRequest(id);
  if (!req) return { ok: false, error: "Request not found." };
  let demoAt: Date | null = null;
  if (when !== null && when !== "") {
    demoAt = new Date(String(when));
    if (Number.isNaN(demoAt.getTime())) return { ok: false, error: "Pick a date and time for the demo." };
  }
  const stage = demoAt && (req.stage === "NEW" || req.stage === "CONTACTED") ? "DEMO_BOOKED" : req.stage;
  await prisma.demoRequest.update({ where: { id }, data: { demoAt, stage } });
  await addEvent(id, actor, "demo", demoAt ? `Demo booked for ${demoAt.toISOString().slice(0, 16).replace("T", " ")} UTC` : "Demo time cleared");
  await audit(actor, "demo_request.demo", req, { demoAt: req.demoAt?.toISOString() ?? null }, { demoAt: demoAt?.toISOString() ?? null });
  return { ok: true };
}

export async function saveDemoNotes(actor: Actor, id: string, notes: unknown): Promise<Result> {
  const req = await loadRequest(id);
  if (!req) return { ok: false, error: "Request not found." };
  const text = typeof notes === "string" ? notes.trim().slice(0, 5000) : "";
  await prisma.demoRequest.update({ where: { id }, data: { notes: text || null } });
  await addEvent(id, actor, "note", "Updated the internal notes");
  return { ok: true };
}

// ── Pilots ────────────────────────────────────────────────────────────────

export type CreatePilotInput = {
  workspaceName: unknown;
  slug: unknown;
  ownerEmail: unknown;
  days: unknown;
  seats: unknown;
  credits: unknown;
  note: unknown;
  sendEmail: unknown;
};

async function freeSlug(base: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const [ws, redirect] = await Promise.all([
      prisma.workspace.findUnique({ where: { slug }, select: { id: true } }),
      prisma.workspaceSlugRedirect.findUnique({ where: { oldSlug: slug }, select: { id: true } }),
    ]);
    if (!ws && !redirect) return slug;
  }
  throw new Error("Could not find a free workspace address.");
}

/**
 * Create the pilot workspace for a request: a Growth workspace until the end
 * date, capped at the seats chosen, with the pilot credits. The contact is
 * made owner straight away when they already have an account, otherwise
 * invited as owner. The request moves to Pilot and links to the workspace.
 */
export async function createPilotFromRequest(actor: Actor, id: string, input: CreatePilotInput, now: Date = new Date()): Promise<Result<{ slug: string; invited: boolean }>> {
  const req = await loadRequest(id);
  if (!req) return { ok: false, error: "Request not found." };
  if (req.workspaceId) return { ok: false, error: "This request already has a pilot workspace." };

  const errors = pilotInputErrors({ days: input.days, seats: input.seats, credits: input.credits });
  const name = typeof input.workspaceName === "string" ? input.workspaceName.trim() : "";
  if (name.length < 2 || name.length > 100) errors.push("The workspace name needs 2 to 100 characters.");
  const rawSlug = typeof input.slug === "string" && input.slug.trim() ? input.slug.trim().toLowerCase() : slugFromCompany(name || req.company);
  if (!/^[a-z0-9-]{2,100}$/.test(rawSlug)) errors.push("The address may use only lowercase letters, numbers and dashes.");
  const ownerEmail = (typeof input.ownerEmail === "string" ? input.ownerEmail : req.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) errors.push("Add a valid owner email.");
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : "";
  if (!note) errors.push("Add a reason for the audit log.");
  if (errors.length) return { ok: false, error: errors.join(" ") };

  const days = Number(input.days);
  const seats = Number(input.seats);
  const credits = Number(input.credits);
  const endsAt = pilotEnd(null, now, days);
  const slug = await freeSlug(rawSlug);
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true, name: true } });

  const { workspace, inviteToken } = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug,
        planName: "GROWTH",
        prepaidThrough: endsAt,
        prepaidSeats: seats,
        prepaidCadence: PILOT_CADENCE,
        billingAccount: { create: { name, ownerUserId: owner?.id ?? null } },
        hiringType: req.hiringType === "non_technical" || req.hiringType === "both" ? req.hiringType : "technical",
        ...(owner ? { members: { create: { userId: owner.id, role: "OWNER" } } } : {}),
      },
      select: { id: true, name: true, slug: true },
    });
    let inviteToken: string | null = null;
    if (!owner) {
      // Owner invites exist only for pilots: the workspace has no owner yet,
      // and accepting makes the contact its owner.
      const invite = await tx.workspaceInvite.create({
        data: { workspaceId: workspace.id, email: ownerEmail, role: "OWNER", invitedById: actor.id, expiresAt: endsAt },
        select: { token: true },
      });
      inviteToken = invite.token;
    }
    if (credits > 0) {
      await tx.aIInterviewCreditLedger.create({
        data: { workspaceId: workspace.id, kind: PILOT_CREDIT_KIND, amount: credits, adminUserId: actor.id, note: `Pilot credits, until ${fmtDay(endsAt)}` },
      });
    }
    await tx.demoRequest.update({ where: { id }, data: { workspaceId: workspace.id, stage: "PILOT" } });
    return { workspace, inviteToken };
  });

  await addEvent(id, actor, "pilot_created", `Created pilot workspace ${workspace.name} (/w/${workspace.slug}) until ${fmtDay(endsAt)}: ${seats} seats, ${credits} credits`);
  await writeWorkspaceAuditEntry({
    workspaceId: workspace.id,
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
    targetType: "workspace",
    targetId: workspace.id,
    meta: { from: null, to: "Pilot", until: endsAt.toISOString(), seats, credits, source: "admin:pilot", demoRequestId: id },
  });
  await audit(actor, "demo_request.pilot_created", req, null, { workspaceId: workspace.id, slug: workspace.slug, until: endsAt.toISOString(), seats, credits, ownerEmail }, note);

  if (input.sendEmail !== false) {
    try {
      const { sendEmail } = await import("@/lib/email");
      const origin = await appOrigin();
      await sendEmail({
        template: "pilot-welcome",
        to: ownerEmail,
        props: {
          name: (owner?.name ?? req.name).split(/\s+/)[0] || req.name,
          workspaceName: workspace.name,
          endsOn: fmtDay(endsAt),
          credits,
          seats,
          url: inviteToken ? `${origin}/invite/${inviteToken}` : `${origin}/w/${workspace.slug}`,
          newAccount: Boolean(inviteToken),
        },
        workspaceId: workspace.id,
        idempotencyKey: `pilot-welcome:${workspace.id}`,
      });
    } catch (err) {
      console.error("[pilot] welcome email failed:", err);
    }
  }
  return { ok: true, slug: workspace.slug, invited: Boolean(inviteToken) };
}

async function pilotWorkspaceFor(id: string) {
  const req = await loadRequest(id);
  if (!req) return { error: "Request not found." } as const;
  if (!req.workspaceId) return { error: "This request has no pilot workspace." } as const;
  const ws = await prisma.workspace.findUnique({
    where: { id: req.workspaceId },
    select: { id: true, name: true, planName: true, stripeSubscriptionId: true, prepaidThrough: true, prepaidCadence: true },
  });
  if (!ws) return { error: "The pilot workspace was deleted." } as const;
  if (!isPilot(ws)) return { error: "This workspace is no longer a pilot: it is on a paid plan." } as const;
  return { req, ws } as const;
}

/** Add days to a pilot (also restarts one that has ended), optionally with more credits. */
export async function extendPilot(actor: Actor, id: string, daysIn: unknown, creditsIn: unknown, note: unknown, now: Date = new Date()): Promise<Result<{ until: string }>> {
  const found = await pilotWorkspaceFor(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  const { req, ws } = found;
  const errors = pilotInputErrors({ days: daysIn, seats: 1, credits: creditsIn ?? 0 });
  const why = typeof note === "string" ? note.trim().slice(0, 500) : "";
  if (!why) errors.push("Add a reason for the audit log.");
  if (errors.length) return { ok: false, error: errors.join(" ") };
  const days = Number(daysIn);
  const credits = Number(creditsIn ?? 0);
  const until = pilotEnd(ws.prepaidThrough, now, days);
  await prisma.workspace.update({ where: { id: ws.id }, data: { planName: "GROWTH", prepaidThrough: until, prepaidReminderAt: null } });
  if (credits > 0) {
    await prisma.aIInterviewCreditLedger.create({
      data: { workspaceId: ws.id, kind: PILOT_CREDIT_KIND, amount: credits, adminUserId: actor.id, note: `More pilot credits, until ${fmtDay(until)}` },
    });
  }
  if (req.stage !== "PILOT" && req.stage !== "CONVERTED") await prisma.demoRequest.update({ where: { id }, data: { stage: "PILOT" } });
  await addEvent(id, actor, "pilot_extended", `Extended the pilot by ${days} days to ${fmtDay(until)}${credits ? `, plus ${credits} credits` : ""}`);
  await writeWorkspaceAuditEntry({
    workspaceId: ws.id,
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
    targetType: "workspace",
    targetId: ws.id,
    meta: { plan: "Pilot", until: until.toISOString(), addedDays: days, addedCredits: credits, source: "admin:pilot" },
  });
  await audit(actor, "demo_request.pilot_extended", req, { until: ws.prepaidThrough?.toISOString() ?? null }, { until: until.toISOString(), credits }, why);
  return { ok: true, until: until.toISOString() };
}

/**
 * End a pilot now: back to Free, and whatever is left of the pilot credits
 * expires. Used by the admin "End pilot" button and by the hourly sweep.
 * Guarded on the end date, so it runs once per pilot period.
 */
export async function finishPilot(
  ws: { id: string; prepaidThrough: Date | null },
  now: Date,
  by: { actor: Actor | null; reason: string },
): Promise<{ finished: boolean; expired: number }> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.workspace.updateMany({
      where: { id: ws.id, planName: "GROWTH", stripeSubscriptionId: null, prepaidCadence: PILOT_CADENCE, prepaidThrough: ws.prepaidThrough },
      data: { planName: "FREE", prepaidThrough: ws.prepaidThrough && ws.prepaidThrough < now ? ws.prepaidThrough : now },
    });
    if (!claimed.count) return { finished: false, expired: 0 };

    const grants = await tx.aIInterviewCreditLedger.findMany({ where: { workspaceId: ws.id, kind: PILOT_CREDIT_KIND }, select: { amount: true, createdAt: true } });
    const already = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id, kind: PILOT_EXPIRED_KIND }, _sum: { amount: true } });
    const firstGrant = grants.reduce<Date | null>((d, g) => (!d || g.createdAt < d ? g.createdAt : d), null);
    let expired = 0;
    if (firstGrant) {
      const [used, refunded, balance] = await Promise.all([
        tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id, kind: "CONSUMPTION", createdAt: { gte: firstGrant } }, _sum: { amount: true } }),
        tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id, kind: "REFUND", createdAt: { gte: firstGrant } }, _sum: { amount: true } }),
        tx.aIInterviewCreditLedger.aggregate({ where: poolWhere(ws.id), _sum: { amount: true } }),
      ]);
      expired = pilotCreditsToExpire({
        granted: grants.reduce((n, g) => n + g.amount, 0) + (already._sum.amount ?? 0),
        usedSince: -(used._sum.amount ?? 0),
        refundedSince: refunded._sum.amount ?? 0,
        balance: balance._sum.amount ?? 0,
      });
      if (expired > 0) {
        await tx.aIInterviewCreditLedger.create({
          data: { workspaceId: ws.id, kind: PILOT_EXPIRED_KIND, amount: -expired, adminUserId: by.actor?.id ?? null, note: "Pilot ended; unused pilot credits expire" },
        });
      }
    }
    await writeWorkspaceAuditEntry(
      {
        workspaceId: ws.id,
        actorUserId: by.actor?.id ?? null,
        actorEmail: by.actor?.email ?? null,
        action: WORKSPACE_AUDIT_ACTIONS.PLAN_CHANGED,
        targetType: "workspace",
        targetId: ws.id,
        meta: { from: "Pilot", to: "Free", expiredCredits: expired, source: by.reason },
      },
    );
    return { finished: true, expired };
  });
}

export async function endPilotNow(actor: Actor, id: string, note: unknown, now: Date = new Date()): Promise<Result<{ expired: number }>> {
  const found = await pilotWorkspaceFor(id);
  if ("error" in found) return { ok: false, error: found.error as string };
  const { req, ws } = found;
  const why = typeof note === "string" ? note.trim().slice(0, 500) : "";
  if (!why) return { ok: false, error: "Add a reason for the audit log." };
  if (ws.planName !== "GROWTH") return { ok: false, error: "The pilot has already ended." };
  const res = await finishPilot(ws, now, { actor, reason: "admin:pilot-ended" });
  if (!res.finished) return { ok: false, error: "The pilot changed while you were looking. Reload and try again." };
  await addEvent(id, actor, "pilot_ended", `Ended the pilot${res.expired ? `; ${res.expired} unused pilot credits expired` : ""}`);
  await audit(actor, "demo_request.pilot_ended", req, { until: ws.prepaidThrough?.toISOString() ?? null }, { endedAt: now.toISOString(), expired: res.expired }, why);
  return { ok: true, expired: res.expired };
}

export { PILOT_DEFAULTS };
